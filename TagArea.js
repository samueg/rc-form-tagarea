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
                tagHeight: 17,
                tags: new RC.MixedCollection(),
                minHeight: 39,
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
                html: Util.htmlEntities(aString),
            });
            ruler.setStyles({
                fontFamily: 'monospace',
                fontSize: '14px',                    
                visibility: 'hidden',
                position: 'absolute',
                left: '400px',
                top: '0px',
                whiteSpace: 'pre'
            });
            ruler.inject(view);
            result = Math.ceil(ruler.getSize().x);
            ruler.dispose();

            return result;
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
                html: Util.htmlEntities(aString)
            });
            ruler.setStyles({
                fontFamily: 'monospace',
                fontSize: '14px',  
                width: Util.pixels(self._getInitialContentDimension().getWidth()),
                visibility: 'hidden',
                position: 'absolute',
                left: '400px',
                top: '100px',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word'
            });
            ruler.inject(view);
            result = Math.ceil(ruler.getSize().y);
            ruler.dispose();

            return result;
        },                 
        _calculateHeight: function() {
            var self = this,
                result = 0,
                pendingContent,
                pendingContentHeight,                
                firstTag,
                startLocation,
                lastTag,
                endLocation,
                tagsHeight
                ;

            pendingContent = self.getPendingContent();
            pendingContentHeight = RC.isEmpty(pendingContent) ? self.tagHeight : 
                                        self._calculateHeightOfAString(pendingContent);

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

            result += self._getInitialNonContentDimension().getHeight();

            return result;
        },  
        _calculateNewTagLocation: function() {
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
        _getOverflowThreshold: function(referredTag) {
            var self = this,
                result = 0,
                location,
                baseLocation,
                difference,
                usedWidth,
                maxAvailableWidth = self._getMaxAvailableWidth()
                ;

            if (!self.hasTags() || !referredTag) {
                result = maxAvailableWidth;
            } else {
                location = referredTag.getNextColumnTopAlignedSiblingLocation(self.tagSpacing);
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
        _relocateCursor: function() {
            var self = this,
                baseLocation,
                cursorLocation,
                difference,
                textarea
                ;

            baseLocation = self._getBaseLocation();
            cursorLocation = self._calculateNewTagLocation();
            difference = cursorLocation.getDifference(baseLocation);
            textarea = self._getTextarea();
            textarea.setStyles({
                paddingLeft: Util.pixels(difference.getWidth()),
                paddingTop: Util.pixels(difference.getHeight())
            });
        },     
        _relocateLastTagIfNecessary: function() {
            var self = this,
                lastTag,
                lastTagLocation,
                lastTagEndX,
                initialContentDimension,
                xThreshold,
                newLocation
                ;

            if (self.hasTags()) {
                lastTag = self.tags.last();
                lastTagLocation = lastTag.getLocation();
                lastTagEndX = lastTagLocation.offset(lastTag.getDimension().getWidth()).getX();

                initialContentDimension = self._getInitialContentDimension();
                xThreshold = self._getBaseLocation().offset(self.fixedPadding).offset(initialContentDimension.getWidth()).getX();
                if (lastTagEndX > xThreshold) {
                    newLocation = self._calculateNewTagLocation();
                    lastTag.setLocation(newLocation);
                }
            }
        },
        _deleteTag: function(tag) {
            var self = this,
                baseLocation = self._getBaseLocation(),
                // Direct Predecessor of the tag
                dp,
                // Direct Follower of the tag 
                df,
                tagView,
                rightPendingTagLocation,
                overflowThreshold,
                downwardPendingTagLocation,
                dfLocation
                ;

            dp = getDp(tag);
            df = getDf(tag);

            tagView = tag.getRenderedCanvas();
            tagView.dispose();

            self.tags.remove(tag);

            while (df) {
                rightPendingTagLocation = dp ? dp.getNextColumnTopAlignedSiblingLocation(self.tagSpacing)
                                             : baseLocation.offset(self.fixedPadding, self.fixedPadding);
                if (rightPendingTagLocation.isTopAligned(df.getLocation())) {
                    dfLocation = rightPendingTagLocation;
                } else {
                    overflowThreshold = self._getOverflowThreshold(dp);
                    if (overflowThreshold >= df.getDimension().getWidth()) {
                        dfLocation = rightPendingTagLocation;
                    } else {
                        downwardPendingTagLocation = baseLocation.offset(self.fixedPadding).setY(dp.getNextRowLeftAlignedSiblingLocation(self.tagSpacing).getY());
                        dfLocation = downwardPendingTagLocation;
                    }
                }
                df.setLocation(dfLocation);
                dp = df;
                df = getDf(df);
            }
            
            self.refresh();

            self.focus();

            function getDp(tag) {
                var tagIndex
                    ;

                tagIndex = self.tags.indexOf(tag);

                return (tagIndex == -1 || tagIndex == 0) ? null 
                                                         : self.tags.itemAt(tagIndex - 1);             
            }

            function getDf(tag) {
                var tagIndex
                    ;

                tagIndex = self.tags.indexOf(tag);

                return (tagIndex == -1 || tagIndex == (self.tags.length - 1)) ? null 
                                                                              : self.tags.itemAt(tagIndex + 1);             
            }
        },
        render: function() {
            var self = this,
                view,
                textarea;

            view = new Element('div', {
                id: self.getId() + '-field'
            });
            view.setStyles({
                position: 'relative',
                height: Util.pixels(self.minHeight)
            });

            textarea = new Element('textarea', {
                name: self.name
            });
            textarea.tagArea = self;
            textarea.setStyles({
                fontFamily: 'monospace',
                fontSize: '14px',
                resize: 'none',
                padding: Util.pixels(self.fixedPadding),
                boxSizing: 'border-box',
                width: '100%',
                height: '100%',
                overflow: 'hidden'
            });
            textarea.inject(view);
            textarea.addEvent('newTagIsGoingToBeCreated', function(event) {
                event.preventDefault();
                
                var text = textarea.getProperty('value'),
                    maxAvailableWidth = self._getMaxAvailableWidth(),
                    tag = new Tag(text, text, self.tagHeight, maxAvailableWidth),
                    tagLocation
                    ;

                tag.compile(view);
                tagLocation = self._calculateNewTagLocation();
                tag.setLocation(tagLocation);
                self.tags.add(tag);
                tag.onDelete(function(tag) {
                    self._deleteTag(tag);
                });

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
        getInputElementSearchString: function() {
            var self = this
                ;

            return 'textarea[name=' + self.name + ']';
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
                lastTag,
                overflowThreshold,          
                pendingContent,
                pendingContentWidth
                ;

            lastTag = self.tags.last();
            overflowThreshold = self._getOverflowThreshold(lastTag);
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
                view
                ;

            self._requireView();

            self._relocateLastTagIfNecessary();
            self._relocateCursor();

            view = self.getRenderedCanvas();
            view.setStyle('height', self._calculateHeight());
        }
    });

    var Tag = RC.extend(RC.Element, {
        constructor: function(text, value, tagHeight, tagMaxWidth) {
            Tag.superclass.constructor.apply(this, [{}]);
            this.text = text;
            this.value = value;
            this.tagHeight = tagHeight;
            this.tagMaxWidth = tagMaxWidth;

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
                tableView,
                tableRowView,
                textView,
                deleteIconView,
                deleteIconViewWidth = 20
                ;

            view = new Element('div');
            view.setStyles({
                backgroundColor: self.backgroundColor,
                display: 'block',
                position: 'absolute',
                left: '0px',
                top: '0px'
            });

            tableView = (new Element('table', {
                cellSpacing: '0px',
                cellPadding: '0px'
            })).inject(view);

            tableRowView = (new Element('tr')).inject(tableView);

            textView = (new Element('div', {
                html: Util.htmlEntities(self.text)
            })).inject((new Element('td', {
                style: RC.UI.Message('max-width: {0};', Util.pixels(self.tagMaxWidth - deleteIconViewWidth))
            })).inject(tableRowView));
            textView.setStyles({
                fontFamily: 'monospace',
                fontSize: '14px',                
                height: Util.pixels(self.tagHeight),
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'pre'
            });   
            Util.enableSmartTooltip(textView);         

            deleteIconView = (new Element('td', {
                html: '&times;'
            })).inject(tableRowView);
            deleteIconView.setStyles({
                fontFamily: 'monospace',
                fontSize: '14px',                    
                width: Util.pixels(deleteIconViewWidth),
                textAlign: 'center',
                cursor: 'pointer'
            }); 
            deleteIconView.addEvent('click', function() {
                self.fireListener('delete', self);
            });         

            return view;
        },
        getId: function() {
            return this.id;
        },
        getLocation: function() {
            var self = this,
                view,
                offsetParent,
                position
                ;

            self._requireView();

            view = self.getRenderedCanvas()
            offsetParent = view.getOffsetParent();
            position = view.getPosition(offsetParent);

            return new Location(position.x, position.y);
        },
        setLocation: function(location) {
            var self = this,
                view
                ;

            self._requireView();

            view = self.getRenderedCanvas();
            view.setStyles({
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
        onDelete: function(fn, scope) {
            var self = this
                ;

            self.addListener('delete', fn, scope);
        },
        getValue: function() {
            return this.value;
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
        },
        isTopAligned: function(location) {
            var self = this
                ;

            return self.getY() == location.getY();
        },
        isLeftAligned: function(location) {
            var self = this
                ;

            return self.getX() == location.getX();
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
                leftBorderWidth = Util.choosePixels(borderWidths.left, element.getStyle('border-left-width'));
                leftPadding = Util.choosePixels(paddings.left, element.getStyle('padding-left'));
                rightBorderWidth = Util.choosePixels(borderWidths.right, element.getStyle('border-right-width'));
                rightPadding = Util.choosePixels(paddings.right, element.getStyle('padding-right'));
                topBorderWidth = Util.choosePixels(borderWidths.top, element.getStyle('border-top-width'));
                topPadding = Util.choosePixels(paddings.top, element.getStyle('padding-top'));
                bottomBorderWidth = Util.choosePixels(borderWidths.bottom, element.getStyle('border-bottom-width'));
                bottomPadding = Util.choosePixels(paddings.bottom, element.getStyle('padding-bottom'));
                        
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

                width = Util.choosePixels(borderWidths.left, element.getStyle('border-left-width')) + 
                        Util.choosePixels(paddings.left, element.getStyle('padding-left')) +
                        Util.choosePixels(paddings.right, element.getStyle('padding-right')) +
                        Util.choosePixels(borderWidths.right, element.getStyle('border-right-width'));

                height = Util.choosePixels(borderWidths.top, element.getStyle('border-top-width')) + 
                         Util.choosePixels(paddings.top, element.getStyle('padding-top')) +
                         Util.choosePixels(paddings.bottom, element.getStyle('padding-bottom')) +
                         Util.choosePixels(borderWidths.bottom, element.getStyle('border-bottom-width'));

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
            },
            choosePixels: function(pxiels1, pixels2) {
                pxiels1 = parseFloat(pxiels1);
                pixels2 = parseFloat(pixels2);

                return isNaN(pxiels1) ? (isNaN(pixels2) ? 0 : pixels2) : pxiels1;
            },
            htmlEntities: function(str) {
                return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            }       
        },
        initialize: function() {
            throw 'Util can not be instantiated.';
        }
    });
})();

RC.reg('x-form-tagarea', RC.form.TagArea);

