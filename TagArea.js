(function() {
    Element.Events.newTagIsGoingToBeCreated = {
        base: 'keypress',
        condition: function(event) {
            return 'enter' == event.key;
        }
    };

    Element.Events.pendingContentNormal = {
        base: 'keyup',
        condition: function(event) {
            var tagArea = event.target.tagArea
                ;

            return  ('enter' != event.key) && tagArea && !tagArea.hasOverflowedPendingContent();
        }
    };    

    Element.Events.pendingContentOverflow = {
        base: 'keyup',
        condition: function(event) {
            var tagArea = event.target.tagArea
                ;

            return  ('enter' != event.key) && tagArea && tagArea.hasOverflowedPendingContent();
        }
    };   

    Element.Events.tagOverflow = {

    };

    Class.Mutators.GetterSetter = function(properties) { 
        var klass = this; 
        Array.from(properties).each(function(property) {
            var captProp = property.capitalize(), // changes 'prop' to 'Prop' 
                $prop = '$' + property; // changes 'prop' to '$prop'

            // setter method
            klass.implement('set' + captProp, function(value) {
                this[$prop] = value;
                return this;
            });
            // getter method
            klass.implement('get' + captProp, function(value){
                return this[$prop]; 
            });
        }); 
    };

    RC.form.TagArea = RC.extend(RC.form.Field, {
        constructor: function(config) {
            var self = this
                ;

            config = config || {};
            RC.apply(config, {
                fixedPadding: 10,
                tagSpacing: 5,
                tags: new RC.MixedCollection(),
                minHeight: 36,
                maxHeight: 400
            });

            RC.form.TagArea.superclass.constructor.apply(this, [config]);
        },
        render: function() {
            var self = this,
                view,
                textarea;

            view = new Element('div', {
                id: self.getId() + '-view'
            });
            view.setStyles({
                position: 'relative',
                height: pixels(self.minHeight)
            });

            textarea = new Element('textarea');
            textarea.tagArea = self;
            textarea.setStyles({
                fontFamily: 'monospace',
                fontSize: '14px',
                resize: 'none',
                padding: pixels(self.fixedPadding),
                boxSizing: 'border-box',
                width: '100%',
                height: '100%',
                overflow: 'hidden'
            });
            textarea.inject(view);
            textarea.addEvent('newTagIsGoingToBeCreated', function(event) {
                event.preventDefault();
                
                var text = textarea.getProperty('value'),
                    tag = new Tag(text, null),
                    tagLocation,
                    cursorLocation,
                    overflowThreshold;

                tag.compile(view);
                tagLocation = self._calculateNewTagLocation(tag);
                tag.setLocation(tagLocation);
                self.tags.add(tag);

                textarea.setProperty('value', '');

                overflowThreshold = self._getOverflowThreshold();
                if (overflowThreshold > 0) {
                    cursorLocation = tag.getNextColumnTopAlignedSiblingLocation(self.tagSpacing);
                } else {
                    cursorLocation = self._getBaseLocation().offset(self.fixedPadding, 0).setY(tag.getNextRowLeftAlignedSiblingLocation(self.tagSpacing).getY());
                }
                self._updateCursorLocation(cursorLocation);

                self._updateViewHeight();
            });

            textarea.addEvent('pendingContentOverflow', function(event) {
                var referredTag,
                    cursorLocation,
                    viewHeight
                    ;

                if (self.hasTags() && self._isAvailableSpaceShrinked()) {
                    referredTag = self.tags.last();
                    cursorLocation = self._getBaseLocation().offset(self.fixedPadding, 0).setY(referredTag.getNextRowLeftAlignedSiblingLocation(self.tagSpacing).getY());
                    self._updateCursorLocation(cursorLocation);
                }

                self._updateViewHeight();
            });

            textarea.addEvent('pendingContentNormal', function(event) {
                var referredTag,
                    cursorLocation
                    ;

                if (self.hasTags() && !self._isAvailableSpaceShrinked()) {
                    referredTag = self.tags.last();
                    cursorLocation = referredTag.getTailLocation().offset(self.tagSpacing);
                    self._updateCursorLocation(cursorLocation);                     
                }
  

                self._updateViewHeight();
            });

            return view;
        },
        getId: function() {
            return this.id;
        },
        hasTags: function() {
            var self = this
                ;

            return self.tags.length > 0;
        },
        getPendingContent: function() {
            var self = this,
                textarea = self._getTextArea()
                ;

            return textarea ? textarea.getProperty('value') : '';
        },     
        _getOverflowThreshold: function() {
            var self = this,
                result = 0,
                lastTag,
                location,
                baseLocation,
                difference,
                usedWidth,
                maxAvailableWidth = self._getMaxAvailableWidth()
                ;

            if (!self.hasTags()) {
                result = maxAvailableWidth;
            } else {
                lastTag = self.tags.last();
                location = lastTag.getNextColumnTopAlignedSiblingLocation(self.tagSpacing);
                baseLocation = self._getBaseLocation();
                difference = location.getDifference(baseLocation);
                usedWidth = difference.getWidth() - self.fixedPadding;
                result = maxAvailableWidth - usedWidth;
            }

            return Math.max(result, 0);
        },        
        hasOverflowedPendingContent: function() {
            var self = this,
                result = false,
                pendingContent,
                pendingContentWidth,
                overflowThreshold
                ;

            pendingContent = self.getPendingContent();
            if (!RC.isEmpty(pendingContent)) {
                pendingContentWidth = self._calculateWidthOfAString(pendingContent);
                overflowThreshold = self._getOverflowThreshold();
                console.log('pendingContentWidth/overflowThreshold: ' + pendingContentWidth + '/' + overflowThreshold);
                result = pendingContentWidth > overflowThreshold;
            }

            return result;
        },
        _isAvailableSpaceShrinked: function() {
            var self = this,
                availableWidth,
                maxAvailableWidth,
                pendingContentWidth
                ;

            availableWidth = self._getAvailableWidth();
            maxAvailableWidth = self._getMaxAvailableWidth();

            return availableWidth != maxAvailableWidth;
        },
        _updateViewHeight: function() {
            var self = this,
                view = self.getRenderedCanvas(),
                textareaContentHeight,
                firstTag,
                startLocation,
                lastTag,
                endLocation,
                pendingContent,
                pendingContentHeight,
                pendingContentOverflowed
                ;

            if (view) {
                // update height
                pendingContent = self.getPendingContent();
                pendingContentHeight = calculatePendingContentHeight(pendingContent);
                pendingContentOverflowed = self.hasOverflowedPendingContent();
                if (!self.hasTags()) {
                    textareaContentHeight = pendingContentHeight;
                } else {
                    firstTag = self.tags.first();
                    startLocation = firstTag.getLocation();
                    lastTag = self.tags.last();
                    endLocation = lastTag.getNextRowLeftAlignedSiblingLocation(pendingContentOverflowed ? self.tagSpacing : 0);                    
                    textareaContentHeight = endLocation.getDifference(startLocation).getHeight() 
                        + (pendingContentOverflowed ? pendingContentHeight : 0);
                }
                view.setStyle('height', textareaContentHeight + 22);
            }

            function calculatePendingContentHeight(pendingContent) {
                var pendingContentWidth,
                    maxAvailableWidth,
                    rows,
                    rowHeight = 14,
                    result
                    ;

                if (RC.isEmpty(pendingContent)) {
                    result = rowHeight;
                } else {
                    pendingContentWidth = self._calculateWidthOfAString(pendingContent);
                    maxAvailableWidth = self._getMaxAvailableWidth();
                    rows = Math.ceil(pendingContentWidth / maxAvailableWidth);
                    result = rows * rowHeight + (rows - 1) * self.tagSpacing;
                }

                return result;
            }
        },
        _getTextArea: function() {
            var self = this,
                view = self.getRenderedCanvas()
                ;

            return view ? view.getElement('textarea') : null;
        },
        _getBaseLocation: function() {
            var self = this,
                result = new Location(),
                view = self.getRenderedCanvas(),
                textarea
                ;

            if (view) {
                textarea = self._getTextArea();
                x = parseFloat(view.getStyle('padding-left')) + parseFloat(textarea.getStyle('margin-left')) 
                    + parseFloat(textarea.getStyle('border-left-width'));
                y = parseFloat(view.getStyle('padding-top')) + parseFloat(textarea.getStyle('margin-top'))
                    + parseFloat(textarea.getStyle('border-top-width'));
                result = new Location(x, y);
            }

            return result;
        },        
        _getAvailableWidth: function() {
            var self = this,
                textarea = self._getTextArea()
                ;

            return textarea ? getContentDimension(textarea).getWidth() : 0;
        },
        _getMaxAvailableWidth: function() {
            var self = this,
                textarea = self._getTextArea(),
                paddings = {
                    top: self.fixedPadding,
                    right: self.fixedPadding,
                    bottom: self.fixedPadding,
                    left: self.fixedPadding
                }
                ;

            return textarea ? getContentDimension(textarea, paddings).getWidth() : 0;            
        },
        _calculateWidthOfAString: function(aString) {
            var self = this,
                result = 0,
                view = self.getRenderedCanvas(),
                ruler
                ;

            if (view) {
                ruler = new Element('span', {
                    id: getRulerId(),
                    html: replaceSpaces(aString),
                });
                ruler.setStyles({
                    fontFamily: 'monospace',
                    fontSize: '14px',                    
                    visibility: 'hidden',
                    position: 'absolute',
                    whiteSpace: 'nowrap'
                });
                ruler.inject(view);
                result = Math.ceil(ruler.getSize().x);
                ruler.dispose();
            }

            return result;

            function getRulerId() {
                return self.getId() + '-ruler';
            }

            function replaceSpaces(aString) {
                var regExps = [/^\s+/, /\s+$/],
                    matchResult,
                    substitution
                    ;

                aString = aString || '';
                regExps.each(function(regExp) {
                    matchResult = aString.match(regExp);
                    if (matchResult) {
                        length = matchResult[0].length;
                        substitution = '';
                        while (length--) {
                            substitution += '&nbsp;'
                        }
                        aString = aString.replace(regExp, substitution);
                    }
                });
                
                return aString;
            }
        },
        _calculateNewTagLocation: function(newTag) {
            var self = this,
                result = self._getBaseLocation(),
                textarea,
                leftPadding,
                topPadding,
                tagWidth,
                overflowThreshold,
                lastTag
                ;

            overflowThreshold = self._getOverflowThreshold();
            tagWidth = newTag.getDimension().getWidth();
            console.log('overflowThreshold/New tag width: ' + overflowThreshold + '/' + tagWidth);
            if (!self.hasTags() || tagWidth > overflowThreshold) {
                textarea = self._getTextArea();
                if (textarea) {
                    leftPadding = parseFloat(textarea.getStyle('padding-left'));
                    topPadding = parseFloat(textarea.getStyle('padding-top'));
                    result = result.offset(leftPadding, topPadding);
                }
            } else {
                lastTag = self.tags.last();
                result = lastTag.getNextColumnTopAlignedSiblingLocation(self.tagSpacing);
            } 

            return result;
        },
        _updateCursorLocation: function(cursorLocation) {
            var self = this,
                textarea,
                baseLocation,
                difference
                ;

            textarea = self._getTextArea();
            if (textarea) {
                baseLocation = self._getBaseLocation();
                difference = cursorLocation.getDifference(baseLocation);
                textarea.setStyles({
                    paddingLeft: pixels(difference.getWidth()),
                    paddingTop: pixels(difference.getHeight())
                });
            }
        }        
    });

    var Tag = RC.extend(RC.Element, {
        constructor: function(text, value) {
            Tag.superclass.constructor.apply(this, [{}]);
            this.text = text;
            this.value = value;

            var config = {
                backgroundColor: '#00FF00'
            };
            RC.apply(this, config);
        },
        render: function() {
            var self = this, 
                view, textSpan, deleteIconSpan;

            view = new Element('div');
            view.setStyles({
                backgroundColor: self.backgroundColor,
                display: 'inline-block',
                position: 'absolute'
            });
            
            textSpan = new Element('span', {
                html: self.text
            });
            textSpan.setStyles({
                whiteSpace: 'nowrap'
            });
            textSpan.inject(view);

            deleteIconSpan = new Element('span', {
                html: '&times;'
            });
            deleteIconSpan.inject(view);

            return view;
        },
        getId: function() {
            return this.id;
        },
        getLocation: function() {
            var self = this,
                result = new Location(),
                view = self.getRenderedCanvas(),
                offsetParent,
                position
                ;

            if (view) {
                offsetParent = view.getOffsetParent();
                position = view.getPosition(offsetParent);
                result = new Location(position.x, position.y);
            }

            return result;
        },
        setLocation: function(location) {
            var self = this,
                view = self.getRenderedCanvas();
            view && view.setStyles({
                left: location.getX(),
                top: location.getY()
            });
        },
        getTailLocation: function() {
            return this.getLocation().offset(this.getDimension().getWidth());
        },
        getNextRowLeftAlignedSiblingLocation: function(spacing) {
            var self = this
                ;

            spacing = RC.isNumeric(spacing) ? spacing : 0;

            return self.getLocation().offset(0, self.getDimension().getHeight()).offset(0, spacing);
        },
        getNextColumnTopAlignedSiblingLocation: function(spacing) {
            var self = this
                ;

            spacing = RC.isNumeric(spacing) ? spacing : 0;

            return self.getLocation().offset(self.getDimension().getWidth(), 0).offset(spacing, 0);
        },        
        getDimension: function() {
            var self = this,
                result = new Dimension(),
                view = self.getRenderedCanvas(),
                size
                ;

            if (view) {
                size = view.getSize();
                result = new Dimension(size.x, size.y);
            }

            return result;
        }

    });

    var Location = new Class({
        GetterSetter: ['x', 'y'],
        initialize: function(x, y) {
            this.setX(x || 0);
            this.setY(y || 0);
        },
        offset: function(x, y) {
            var location, 
                dimension
                ;

            if (x instanceof Location) {
                location = x;
                x = location.getX();
                y = location.getY();
            } else if (x instanceof Dimension) {
                dimension = x;
                x = dimension.getWidth();
                y = dimension.getHeight();
            }
            x = x || 0;
            y = y || 0;

            return new Location(this.getX() + x, this.getY() + y);
        },
        getDifference: function(location) {
            var self = this
                ;
            return new Dimension(self.getX() - location.getX(), self.getY() - location.getY());
        }
    });

    var Dimension = new Class({
        GetterSetter: ['width', 'height'],
        initialize: function(width, height) {
            this.setWidth(width || 0);
            this.setHeight(height || 0);
        },
        add: function(dimension) {
            var result
                ;

            result = new Dimension(self.getWidth() + dimension.getWidth(), 
                self.getHeight() + dimension.getHeight());

            return result;
        }
    });

    function pixels(value) {
        value = parseInt(value);
        return isNaN(value) ? '0px' : (value + 'px');
    }

    function calculateTagDimension(tagArea, tag) {
        return new Dimension();
    }

    function getContentLocation(element, paddings, borderWidths) {
        var x,
            y
            ;

        paddings = paddings || {};
        borderWidths = borderWidths || {};

        x = (borderWidths.left || parseFloat(element.getStyle('border-left-width'))) 
                + (paddings.left || parseFloat(element.getStyle('padding-left')));
        y = (borderWidths.top || parseFloat(element.getStyle('border-top-width')))
                + (paddings.top || parseFloat(element.getStyle('padding-top')));

        return new Location(x, y);
    }

    function getContentDimension(element, paddings, borderWidths) {
        var size,
            leftBorderWidth,
            leftPadding,
            rightBorderWidth,
            rightPadding,
            topBorderWidth,
            topPadding,
            bottomBorderWidth,
            bottomPadding,
            width,
            height
            ;

        paddings = paddings || {};
        borderWidths = borderWidths || {};

        size = element.getSize();
        leftBorderWidth = borderWidths.left || parseFloat(element.getStyle('border-left-width'));
        leftPadding = paddings.left || parseFloat(element.getStyle('padding-left'));
        rightBorderWidth = borderWidths.right || parseFloat(element.getStyle('border-right-width'));
        rightPadding = paddings.right || parseFloat(element.getStyle('padding-right'));
        topBorderWidth = borderWidths.top || parseFloat(element.getStyle('border-top-width'));
        topPadding = paddings.top || parseFloat(element.getStyle('padding-top'));
        bottomBorderWidth = borderWidths.bottom || parseFloat(element.getStyle('border-bottom-width'));
        bottomPadding = paddings.bottom || parseFloat(element.getStyle('padding-bottom'));
                
                
        width = size.x - leftBorderWidth - leftPadding - rightBorderWidth - rightPadding;
        height = size.y - topBorderWidth - topPadding - bottomBorderWidth - bottomPadding;
        return new Dimension(width, height);
    }
})();

RC.reg('x-form-tagarea', RC.form.TagArea);

