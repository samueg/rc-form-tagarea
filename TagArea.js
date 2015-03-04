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

    Class.Mutators.Static = function(members){
        this.extend(members);
    };    

    RC.form.TagArea = RC.extend(RC.form.Field, {
        constructor: function(config) {
            var self = this
                ;

            config = config || {};
            RC.apply(config, {
                fixedPadding: 10,
                tagSpacing: 5,
                tagHeight: 15,
                tags: new RC.MixedCollection(),
                minHeight: 37,
                maxHeight: 400
            });

            RC.form.TagArea.superclass.constructor.apply(this, [config]);
        },
        _requireView: function() {
            var self = this,
                view
                ;

            view = self.getRenderedCanvas();
            if (!view) {
                throw 'TagArea is not rendered.'
            }
        },
        _getTextarea: function() {
            var self = this,
                view
                ;

            self._requireView();

            view = self.getRenderedCanvas();

            return view.getElement('textarea');
        },        
        _getBaseLocation: function() {
            var self = this,
                view,
                textarea
                ;

            self._requireView();

            view = self.getRenderedCanvas();
            textarea = self._getTextarea();
            x = parseFloat(view.getStyle('padding-left')) + parseFloat(textarea.getStyle('margin-left')) 
                + parseFloat(textarea.getStyle('border-left-width'));
            y = parseFloat(view.getStyle('padding-top')) + parseFloat(textarea.getStyle('margin-top'))
                + parseFloat(textarea.getStyle('border-top-width'));

            return new Location(x, y);
        },         
        _getInitialContentDimension: function() {
            var self = this,
                textarea,
                paddings = {
                    top: self.fixedPadding,
                    right: self.fixedPadding,
                    bottom: self.fixedPadding,
                    left: self.fixedPadding
                }
                ;

            textarea =  self._getTextarea();

            return Dimension.fromElementContent(textarea, paddings);  
        },
        _getInitialNonContentDimension: function() {
            var self = this,
                textarea,
                paddings = {
                    top: self.fixedPadding,
                    right: self.fixedPadding,
                    bottom: self.fixedPadding,
                    left: self.fixedPadding
                }
                ;

            textarea =  self._getTextarea();

            return Dimension.fromElementNonContent(textarea, paddings);  
        },        
        _calculateWidthOfAString: function(aString) {
            var self = this,
                result = 0,
                view,
                ruler
                ;

            self._requireView();

            view = self.getRenderedCanvas();
            ruler = new Element('span', {
                html: replaceSpaces(aString),
            });
            ruler.setStyles({
                fontFamily: 'monospace',
                fontSize: '14px',                    
                visibility: 'hidden',
                position: 'absolute',
                left: '0px',
                top: '0px',
                whiteSpace: 'nowrap'
            });
            ruler.inject(view);
            result = Math.ceil(ruler.getSize().x);
            ruler.dispose();

            return result;

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
        _calculateHeightOfAString: function(aString) {
            var self = this,
                result = 0,
                view,
                ruler
                ;

            self._requireView();

            view = self.getRenderedCanvas();
            ruler = new Element('div', {
                html: replaceSpaces(aString),
            });
            ruler.setStyles({
                fontFamily: 'monospace',
                fontSize: '14px',                    
                // visibility: 'hidden',
                position: 'absolute',
                left: '400px',
                top: '0px',
                border: '0px',
                padding: '0px',
                width: Util.pixels(self._getInitialContentDimension().getWidth())/*,
                wordBreak: 'break-all'*/,
                wordWrap: 'break-word'
            });
            ruler.inject(view);
            result = Math.ceil(ruler.getSize().y);
            // ruler.dispose();

            return result;

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
        _calculateHeight: function() {
            var self = this,
                result = 0,
                firstTag,
                startLocation,
                lastTag,
                endLocation,
                tagsHeight = 0,
                pendingContent,
                pendingContentHeight,
                dimension,
                textarea,
                initialContentDimension
                ;

            pendingContent = self.getPendingContent();
            pendingContentHeight = calculatePendingContentHeight(pendingContent);

            if (!self.hasTags()) {
                result = pendingContentHeight;                
            } else {
                firstTag = self.tags.first();
                startLocation = firstTag.getLocation();
                lastTag = self.tags.last();
                endLocation = lastTag.getNextRowLeftAlignedSiblingLocation();
                tagsHeight = endLocation.getDifference(startLocation).getHeight();
                result = tagsHeight;

                if (self.hasOverflowedPendingContent()) {
                    result += (self.tagSpacing + pendingContentHeight);
                }
            }

/*            dimension = self.getDimension();
            textarea = self._getTextarea();
            initialContentDimension = self._getInitialContentDimension();
            fixedHeight =  dimension.getHeight() - initialContentDimension.getHeight();*/
            result += self._getInitialNonContentDimension().getHeight();

            return result;

            function calculatePendingContentHeight(pendingContent) {
                var result,
                    pendingContentWidth,
                    maxAvailableWidth,
                    rows
                    ;

                if (RC.isEmpty(pendingContent)) {
                    result = self.tagHeight;
                } else {
/*                    pendingContentWidth = self._calculateWidthOfAString(pendingContent);
                    maxAvailableWidth = self._getMaxAvailableWidth();
                    rows = Math.ceil(pendingContentWidth / maxAvailableWidth);
                    result = rows * self.tagHeight + (rows - 1) * self.tagSpacing;*/

/*                    var scrollDimension = Dimension.fromElementSize(self._getTextarea().getScrollSize());
                    result = scrollDimension.getHeight() - Dimension.fromElementNonContent(self._getTextarea()).getHeight();*/
                    result = self._calculateHeightOfAString(pendingContent);
                }

                // result = self.tagHeight + (RC.isEmpty(pendingContent) ? 0 : self._getTextarea().getScroll().y);

                return result;             
            }
        },  
        _calculateCursorLocation: function() {
            var self = this,
                result,
                baseLocation = self._getBaseLocation(),
                lastTag,
                pendingContentOverflowed
                ;

            if (!self.hasTags()) {
                result = baseLocation.offset(self.fixedPadding, self.fixedPadding);
            } else {
                lastTag = self.tags.last();
                pendingContentOverflowed = self.hasOverflowedPendingContent();
                if (pendingContentOverflowed) {
                    result = baseLocation.offset(self.fixedPadding, 0).setY(lastTag.getNextRowLeftAlignedSiblingLocation(self.tagSpacing).getY());
                } else {                        
                    result = lastTag.getNextColumnTopAlignedSiblingLocation(self.tagSpacing);
                }
            }

            return result;
        },
        _updateCursorLocation: function(cursorLocation) {
            var self = this,
                textarea,
                baseLocation,
                difference
                ;

            textarea = self._getTextarea();
            baseLocation = self._getBaseLocation();
            difference = cursorLocation.getDifference(baseLocation);
            textarea.setStyles({
                paddingLeft: Util.pixels(difference.getWidth()),
                paddingTop: Util.pixels(difference.getHeight())
            });
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
        _getAvailableWidth: function() {
            var self = this,
                textarea = self._getTextarea()
                ;

            return Dimension.fromElementContent(textarea).getWidth();
        },
        _getMaxAvailableWidth: function() {
            var self = this
                ;

            return self._getInitialContentDimension().getWidth();        
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
            console.log('overflowThreshold/newTagWidth: ' + overflowThreshold + '/' + tagWidth);
            if (!self.hasTags() || tagWidth > overflowThreshold) {
                textarea = self._getTextarea();
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
        render: function() {
            var self = this,
                view,
                textarea;

            view = new Element('div', {
                id: self.getId() + '-view'
            });
            view.setStyles({
                position: 'relative',
                height: Util.pixels(self.minHeight)
            });

            textarea = new Element('textarea');
            textarea.tagArea = self;
            textarea.setStyles({
                fontFamily: 'monospace',
                fontSize: '14px',
                resize: 'none',
                padding: Util.pixels(self.fixedPadding),
                boxSizing: 'border-box',
                width: '100%',
                height: '100%',
                overflow: 'hidden'/*,
                wordBreak: 'break-all',
                wordWrap: 'break-word'*/
            });
            textarea.inject(view);
            textarea.addEvent('newTagIsGoingToBeCreated', function(event) {
                event.preventDefault();
                
                var text = textarea.getProperty('value'),
                    tag = new Tag(text, null),
                    tagLocation,
                    maxAvailableWidth = self._getMaxAvailableWidth()
                    ;

                tag.compile(view);
                tagLocation = self._calculateCursorLocation();
                tag.setLocation(tagLocation);
                if (tag.getDimension().getWidth() > maxAvailableWidth) {
                    tag.setMaxWidth(maxAvailableWidth);
                }
                self.tags.add(tag);

                textarea.setProperty('value', '');

                self.refresh();
            });

            textarea.addEvent('pendingContentOverflow', function(event) {
                self.refresh();
            });

            textarea.addEvent('pendingContentNormal', function(event) {
                self.refresh();
            });

            return view;
        },        
        getId: function() {
            return this.id;
        },
        getDimension: function() {
            var self = this,
                view
                ;

            self._requireView();
            view = self.getRenderedCanvas();

            return Dimension.fromElement(view);
        },        
        hasTags: function() {
            var self = this
                ;

            return self.tags.length > 0;
        },
        getPendingContent: function() {
            var self = this,
                textarea = self._getTextarea()
                ;

            return textarea ? textarea.getProperty('value') : '';
        },
        hasOverflowedPendingContent: function() {
            var self = this,
                overflowThreshold,          
                pendingContent,
                pendingContentWidth
                ;

            overflowThreshold = self._getOverflowThreshold();
            if (overflowThreshold == 0) {
                return true;
            }

            pendingContent = self.getPendingContent();
            pendingContentWidth = self._calculateWidthOfAString(pendingContent);
            console.log('overflowThreshold/pendingContentWidth: ' + overflowThreshold + '/' + pendingContentWidth);
            return pendingContentWidth > overflowThreshold;
        },
        refresh: function() {
            var self = this,
                view,
                cursorLocation
                ;

            self._requireView();

            cursorLocation = self._calculateCursorLocation();
            self._updateCursorLocation(cursorLocation);

            view = self.getRenderedCanvas();
            view.setStyle('height', self._calculateHeight());
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
        _requireView: function() {
            var self = this,
                view
                ;

            view = self.getRenderedCanvas();
            if (!view) {
                throw 'Tag is not rendered.'
            }
        },   
        render: function() {
            var self = this, 
                view,
                textView,
                deleteIconView
                ;

            view = new Element('div');
            view.setStyles({
                backgroundColor: self.backgroundColor,
                display: 'block',
                position: 'absolute',
                left: '0px',
                top: '0px',
                height: '15px'/*,
                overflow: 'hidden',
                textOverflow: 'ellipsis',                */
            });
            
/*            self.textView = textView = (new Element('span', {
                html: self.text
            })).inject(view);
            textView.setStyles({
                display: 'inline-block',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '332px'
            });   
            textView.setStyles({
                whiteSpace: 'nowrap'
            });             

            deleteIconView = (new Element('span', {
                html: '&times;'
            })).inject(view);
            deleteIconView.setStyles({
                display: 'inline-block',
                width: '20px',
                textAlign: 'center'
            });

            Util.enableSmartTooltip(textView);*/

            var tableView = (new Element('table', {
                cellSpacing: '0px',
                cellPadding: '0px'
            })).inject(view);
            var tableRowView = (new Element('tr')).inject(tableView);
            textView = (new Element('td', {
                html: self.text
            })).inject(tableRowView);
            textView.setStyles({
                whiteSpace: 'nowrap'
            });            

            deleteIconView = (new Element('td', {
                html: '&times;'
            })).inject(tableRowView);
            deleteIconView.setStyles({
                paddingLeft: '20px',
                textAlign: 'center'
            });            

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
                view
                ;

            self._requireView();
            view = self.getRenderedCanvas();

            return Dimension.fromElement(view);
        },
        setMaxWidth: function(maxWidth) {
            var self = this,
                view,
                viewDimension,
                viewContentDimension,
                fixedWidth
                ;

            self._requireView();

            view = self.getRenderedCanvas();
            viewDimension = self.getDimension();
            viewContentDimension = Dimension.fromElementContent(view);
            fixedWidth = viewDimension.getWidth() - viewContentDimension.getWidth();
            view.setStyle('max-width', Util.pixels(maxWidth - fixedWidth));
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
        Static: {
            fromElement: function(element) {
                size = element.getSize();
                return Dimension.fromElementSize(size);
            },
            fromElementSize: function(size) {
                return new Dimension(size.x, size.y);
            },
            fromElementContent: function(element, paddings, borderWidths) {
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
            },
            fromElementNonContent: function(element, paddings, borderWidths) {
                var width,
                    height
                    ;

                paddings = paddings || {};
                borderWidths = borderWidths || {};

                width = (borderWidths.left || parseFloat(element.getStyle('border-left-width'))) + 
                         (paddings.left || parseFloat(element.getStyle('padding-left'))) +
                         (paddings.right || parseFloat(element.getStyle('padding-right'))) +
                         (borderWidths.right || parseFloat(element.getStyle('border-right-width')));

                height = (borderWidths.top || parseFloat(element.getStyle('border-top-width'))) + 
                         (paddings.top || parseFloat(element.getStyle('padding-top'))) +
                         (paddings.bottom || parseFloat(element.getStyle('padding-bottom'))) +
                         (borderWidths.bottom || parseFloat(element.getStyle('border-bottom-width')));
                return new Dimension(width, height);
            }
        },
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

    var Util = new Class({
        Static: {
            pixels: function(value) {
                value = parseInt(value);
                return isNaN(value) ? '0px' : (value + 'px');
            },
            enableSmartTooltip: function(targetElement) {
                if (!RC.isMooElement(targetElement)) return;

                targetElement.addEvent('mouseenter', function() {
                    var offsetWidth = targetElement.getSize().x;
                    var scrollWidth = targetElement.getScrollSize().x;
                    var title = offsetWidth < scrollWidth ? targetElement.get('text') : '';
                    targetElement.set('title', title);
                });
            }           
        },
        initialize: function() {
            throw 'Util can not be instantiated.';
        }
    });
})();

RC.reg('x-form-tagarea', RC.form.TagArea);

