(function() {
    Element.Events.enterPressedToCreateTag = {
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

            return  ('enter' != event.key) && tagArea && !tagArea._hasOverflowedPendingContent();
        }
    };    

    Element.Events.pendingContentOverflow = {
        base: 'keyup',
        condition: function(event) {
            var tagArea = event.target.tagArea
                ;

            return  ('enter' != event.key) && tagArea && tagArea._hasOverflowedPendingContent();
        }
    };

    Element.Events.backspacePressedToDeleteTag = {
        base: 'keydown',
        condition: function(event) {
            var tagArea = event.target.tagArea
                ;

            return  ('backspace' == event.key) && RC.isEmpty(tagArea._getPendingContent());
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

    function suppressEnterPressedToCreateTag() {
        return false;
    }

    RC.form.TagArea = RC.extend(RC.form.Field, {
        constructor: function(config) {
            var self = this,
                viewConfig
                ;

            config = config || {};
            viewConfig = config.viewConfig || {};
            RC.applyIf(viewConfig, {
                // fontFamily: 'monospace',
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: 16,
                tagFontSize: 12,                
                width: 600,
                height: 47,
                padding: 10,
                borderWidth: 1,
                tagHeight: 21,
                tagPadding: 2,
                tagSpacing: 5
            });
            RC.apply(config, {
                viewConfig: viewConfig
            });

            if (RC.isArray(config.tags)) {
                config.initialTags = config.tags;
            }

            RC.form.TagArea.superclass.constructor.apply(this, [config]);

            self.tags = new RC.MixedCollection();

            if (RC.isArray(self.initialTags)) {
                self.initialTags.each(function(initialTag) {
                    self.createTag(initialTag.text, initialTag.value, false, initialTag.actions);
                });
                delete self.initialTags;
            }

            self.setBlurAction(self.blurAction);
        },        
        _getBaseLocation: function() {
            var self = this
                ;

            return new Location(self.viewConfig.borderWidth, self.viewConfig.borderWidth);
        },                 
        _getInitialContentDimension: function() {
            var self = this,
                width,
                height
                ;

            width = self.viewConfig.width - self.viewConfig.borderWidth * 2 - self.viewConfig.padding * 2;
            height = self.viewConfig.height - self.viewConfig.borderWidth * 2 - self.viewConfig.padding * 2;

            return new Dimension(width, height);  
        },
        _getMaxAvailableWidth: function() {
            var self = this
                ;

            return self._getInitialContentDimension().getWidth();        
        },                
        _getInitialNonContentDimension: function() {
            var self = this,
                width,
                height
                ;

            width = self.viewConfig.borderWidth * 2 + self.viewConfig.padding * 2;
            height = self.viewConfig.borderWidth * 2 + self.viewConfig.padding * 2;

            return new Dimension(width, height);  
        },
        _getTagViewConfig: function() {
            var self = this
                ;

            return {
                fontFamily: self.viewConfig.fontFamily,
                fontSize: self.viewConfig.tagFontSize,
                backgroundColor: '#04415D',
                color: '#FFFFFF',
                height: self.viewConfig.tagHeight,
                padding: self.viewConfig.tagPadding,
                maxWidth: self._getMaxAvailableWidth(),
                actionWidth: 12
            };
        },                        
        _calculateWidthOfAString: function(aString) {
            var self = this,
                result,
                ruler
                ;

            ruler = new Element('span', {
                html: Util.htmlEntities(aString),
            });
            ruler.setStyles({
                fontFamily: self.viewConfig.fontFamily,
                fontSize: Util.pixels(self.viewConfig.fontSize),                    
                visibility: 'hidden',
                position: 'absolute',
                left: '0px',
                top: '0px',
                whiteSpace: 'pre'
            });
            ruler.inject($(document.body));
            result = Math.ceil(ruler.getSize().x);
            ruler.destroy();

            return result;
        },
        _calculateHeightOfAString: function(aString) {
            var self = this,
                result,
                ruler
                ;

            ruler = new Element('div', {
                html: Util.htmlEntities(aString)
            });
            ruler.setStyles({
                fontFamily: self.viewConfig.fontFamily,
                fontSize: Util.pixels(self.viewConfig.fontSize),  
                width: Util.pixels(self._getInitialContentDimension().getWidth()),
                visibility: 'hidden',
                position: 'absolute',
                left: '0px',
                top: '0px',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                lineHeight: Util.pixels(self.viewConfig.tagHeight + self.viewConfig.tagPadding * 2)
            });
            ruler.inject($(document.body));
            result = Math.ceil(ruler.getSize().y);
            ruler.destroy();

            return result;
        }, 
        _requireView: function() {
            var self = this,
                view = self.getRenderedCanvas()
                ;

            if (!view) {
                throw 'TagArea is not rendered.'
            }

            return view;
        },        
        _getTextarea: function() {
            var self = this,
                view = self._requireView()
                ;

            return view.getElement('textarea');
        },
        _getPendingContent: function() {
            var self = this,
                textarea = self._getTextarea()
                ;

            return textarea.getProperty('value');
        },
        _clearPendingContent: function() {
            var self = this,
                textarea = self._getTextarea()
                ;

            textarea.setProperty('value', '');
        },
        _getFirstRenderedTag: function() {
            var self = this,
                index,
                tag
                ;

            index = 0;
            while (index <= (self.tags.length - 1)) {
                tag = self.tags.itemAt(index);
                if (tag.getRenderedCanvas()) {
                    return tag;
                }
                index++;
            }

            return null;
        },        
        _getLastRenderedTag: function() {
            var self = this,
                index,
                tag
                ;

            index = self.tags.length - 1;
            while (index >= 0) {
                tag = self.tags.itemAt(index);
                if (tag.getRenderedCanvas()) {
                    return tag;
                }
                index--;
            }

            return null;
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

            if (!referredTag) {
                result = maxAvailableWidth;
            } else {
                location = referredTag.getNextColumnTopAlignedSiblingLocation(self.viewConfig.tagSpacing);
                baseLocation = self._getBaseLocation();
                difference = location.getDifference(baseLocation);
                usedWidth = difference.getWidth() - self.viewConfig.padding;
                result = maxAvailableWidth - usedWidth;
            }

            return Math.max(result, 0);
        },
        _hasOverflowedPendingContent: function() {
            var self = this,
                lastRenderedTag,
                overflowThreshold,          
                pendingContent,
                pendingContentWidth
                ;

            lastRenderedTag = self._getLastRenderedTag();
            overflowThreshold = self._getOverflowThreshold(lastRenderedTag);
            if (overflowThreshold == 0) {
                return true;
            }

            pendingContent = self._getPendingContent();
            pendingContentWidth = self._calculateWidthOfAString(pendingContent);
            
            return pendingContentWidth > overflowThreshold;
        },
        _calculateHeight: function() {
            var self = this,
                result = 0,
                pendingContent,
                pendingContentHeight,                
                firstRenderedTag,
                startLocation,
                lastRenderedTag,
                endLocation,
                tagsHeight
                ;

            pendingContent = self._getPendingContent();
            pendingContentHeight = RC.isEmpty(pendingContent) ? (self.viewConfig.tagHeight + self.viewConfig.tagPadding * 2): 
                                        self._calculateHeightOfAString(pendingContent);
            firstRenderedTag = self._getFirstRenderedTag();
            lastRenderedTag = self._getLastRenderedTag();                                        

            if (!firstRenderedTag) {
                result = pendingContentHeight;                
            } else {
                startLocation = firstRenderedTag.getLocation();
                endLocation = lastRenderedTag.getNextRowLeftAlignedSiblingLocation();
                tagsHeight = endLocation.getDifference(startLocation).getHeight();
                result = tagsHeight;

                if (self._hasOverflowedPendingContent()) {
                    result += (self.viewConfig.tagSpacing + pendingContentHeight);
                }
            }

            result += self._getInitialNonContentDimension().getHeight();

            return result;
        },  
        _calculateNewTagLocation: function() {
            var self = this,
                result,
                baseLocation = self._getBaseLocation(),
                lastRenderedTag = self._getLastRenderedTag(),
                pendingContentOverflowed
                ;

            if (!lastRenderedTag) {
                result = baseLocation.offset(self.viewConfig.padding, self.viewConfig.padding);
            } else {
                pendingContentOverflowed = self._hasOverflowedPendingContent();
                if (pendingContentOverflowed) {
                    result = baseLocation.offset(self.viewConfig.padding, 0).setY(lastRenderedTag.getNextRowLeftAlignedSiblingLocation(self.viewConfig.tagSpacing).getY());
                } else {                        
                    result = lastRenderedTag.getNextColumnTopAlignedSiblingLocation(self.viewConfig.tagSpacing);
                }
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
        _getAvailableWidth: function() {
            var self = this,
                textarea = self._getTextarea()
                ;

            return Dimension.fromElementContent(textarea).getWidth();
        },
        _relocateLastRenderedTagIfNecessary: function() {
            var self = this,
                lastRenderedTag = self._getLastRenderedTag(),
                lastRenderedTagLocation,
                lastRenderedTagEndX,
                initialContentDimension,
                xThreshold,
                newLocation
                ;

            if (lastRenderedTag) {
                lastRenderedTagLocation = lastRenderedTag.getLocation();
                lastRenderedTagEndX = lastRenderedTagLocation.offset(lastRenderedTag.getDimension().getWidth()).getX();

                initialContentDimension = self._getInitialContentDimension();
                xThreshold = self._getBaseLocation().offset(self.viewConfig.padding).offset(initialContentDimension.getWidth()).getX();
                if (lastRenderedTagEndX > xThreshold) {
                    newLocation = self._calculateNewTagLocation();
                    lastRenderedTag.setLocation(newLocation);
                }
            }
        },
        _relocateCursor: function() {
            var self = this,
                baseLocation = self._getBaseLocation(),
                cursorLocation,
                difference,
                textarea = self._getTextarea()
                ;

            cursorLocation = self._calculateNewTagLocation();
            difference = cursorLocation.getDifference(baseLocation);
            textarea.setStyles({
                paddingLeft: Util.pixels(difference.getWidth()),
                paddingTop: Util.pixels(difference.getHeight())
            });
        },        
        _refresh: function() {
            var self = this,
                view = self._requireView()
                ;

            self._relocateLastRenderedTagIfNecessary();
            self._relocateCursor();

            view = self.getRenderedCanvas();
            view.setStyle('height', self._calculateHeight());
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
            tagView.destroy();

            self.tags.remove(tag);

            while (df) {
                rightPendingTagLocation = dp ? dp.getNextColumnTopAlignedSiblingLocation(self.viewConfig.tagSpacing)
                                             : baseLocation.offset(self.viewConfig.padding, self.viewConfig.padding);
                if (rightPendingTagLocation.isTopAligned(df.getLocation())) {
                    dfLocation = rightPendingTagLocation;
                } else {
                    overflowThreshold = self._getOverflowThreshold(dp);
                    if (overflowThreshold >= df.getDimension().getWidth()) {
                        dfLocation = rightPendingTagLocation;
                    } else {
                        downwardPendingTagLocation = baseLocation.offset(self.viewConfig.padding).setY(dp.getNextRowLeftAlignedSiblingLocation(self.viewConfig.tagSpacing).getY());
                        dfLocation = downwardPendingTagLocation;
                    }
                }
                df.setLocation(dfLocation);
                dp = df;
                df = getDf(df);
            }
            
            self._refresh();

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
        _renderWithTag: function(view, tag) {
            var self = this,
                tagLocation = self._calculateNewTagLocation();
                ;

            if (tag.getRenderedCanvas()) {
                return;
            }

            tag.compile(view);
            tag.setLocation(tagLocation);
            self._refresh();
        },
        /**
         * @override
         */
        render: function() {
            var self = this,
                view,
                textarea;

            self.getRenderedCanvas = function() {
                return view;
            };

            view = new Element('div', {
                id: self.getId() + '-field'
            });
            view.setStyles({
                position: 'relative',
                width: Util.pixels(self.viewConfig.width),
                height: Util.pixels(self.viewConfig.height)
            });

            textarea = new Element('textarea', {
                name: self.name
            });
            textarea.tagArea = self;
            textarea.setStyles({
                fontFamily: self.viewConfig.fontFamily,
                fontSize: Util.pixels(self.viewConfig.fontSize),
                resize: 'none',
                padding: Util.pixels(self.viewConfig.padding),
                boxSizing: 'border-box',
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                lineHeight: Util.pixels(self.viewConfig.tagHeight + self.viewConfig.tagPadding * 2)
            });
            textarea.inject(view);
            textarea.addEvent('enterPressedToCreateTag', function(event) {
                var text = self._getPendingContent(),
                    canContinue
                    ;

                event.preventDefault();

                canContinue = self.fireListener('enterPressedToCreateTag', self, text);
                if (canContinue !== false) {
                    self._clearPendingContent();
                    self.createTag(text, text);
                }
            });

            textarea.addEvent('pendingContentOverflow', function(event) {
                self._refresh();
            });

            textarea.addEvent('pendingContentNormal', function(event) {
                self._refresh();
            });

            textarea.addEvent('blur', function(event) {
                var blurAction = self.getBlurAction(),
                    text
                    ;

                switch (blurAction) {
                    case RC.form.TagArea.BlurActions.CLEAR:
                        self._clearPendingContent();
                        break;
                    case RC.form.TagArea.BlurActions.CREATE:
                        text = self._getPendingContent();
                        self._clearPendingContent();
                        self.createTag(text, text);
                        break;
                    case RC.form.TagArea.BlurActions.LEAVE_ALONE:
                        break;
                }
            });

            textarea.addEvent('backspacePressedToDeleteTag', function(event) {
                var lastRenderedTag = self._getLastRenderedTag();
                lastRenderedTag && self._deleteTag(lastRenderedTag);
            });

            if (self.tags.length != 0) {
                self.tags.each(function(tag) {
                    self._renderWithTag(view, tag);
                });
            }

            return view;
        },
        /**
         * @override
         */          
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
                view = self._requireView()
                ;

            return Dimension.fromElement(view);
        },
        createTag: function(text, value, keep, actions) {
            var self = this,
                tag,
                view = self.getRenderedCanvas(),
                pendingContent
                ;

            if (view) {
                pendingContent = self._getPendingContent();
                if (!RC.isEmpty(pendingContent)) {
                    self._clearPendingContent();
                    if (RC.isTrue(keep)) {
                        self.createTag(pendingContent, pendingContent, self._getTagViewConfig());
                    }
                }                
            }

            tag = new Tag(text, value, self._getTagViewConfig(), actions);
            tag.onDelete(function(tag) {
                self._deleteTag(tag);
            });            
            self.tags.add(tag);

            if (view) {   
                self._renderWithTag(view, tag);
            }
        },
        getBlurAction: function() {
            var self = this
                ;

            return self.blurAction;
        },
        setBlurAction: function(blurAction) {
            var self = this
                ;

            if (Object.contains(RC.form.TagArea.BlurActions, blurAction)) {
                self.blurAction = blurAction;
            } else {
                self.blurAction = RC.form.TagArea.BlurActions.CLEAR;
            }

            return self;
        },
        suppressEnterPressedToCreateTag: function() {
            var self = this
                ;

            self.addListener('enterPressedToCreateTag', suppressEnterPressedToCreateTag);
        },
        enableEnterPressedToCreateTag: function(fn) {
            var self = this
                ;

            self.removeListener('enterPressedToCreateTag', suppressEnterPressedToCreateTag);
        },
        getValue: function() {
            var self = this,
                result = []
                ;

            self.tags.each(function(tag) {
                result.push(tag.getValue());
            });

            return result;
        }
    });

    RC.form.TagArea.BlurActions = {
        CLEAR: 1,
        CREATE: 2,
        LEAVE_ALONE: 3
    };

    var Tag = RC.extend(RC.Element, {
        constructor: function(text, value, viewConfig, actions) {
            var self = this
                ;

            Tag.superclass.constructor.apply(self, [{}]);
            self.text = text;
            self.value = value;
            self.viewConfig = viewConfig;
            self.location = new Location();
            self.actions = [];

            actions = RC.isArray(actions) ? actions
                                          : [];
            actions.each(function(action) {
                self.actions.push(action);
            });
            self.actions.push({
                name: 'delete',
                html: '&times;',
                title: 'Delete',
                className: 'tagarea-tag-action-delete',
                handler: function() {
                    self.fireListener('delete', self);
                }
            });
        },
        _requireView: function() {
            var self = this,
                view = self.getRenderedCanvas()
                ;

            if (!view) {
                throw 'Tag is not rendered.'
            }

            return view;
        },
        /**
         * @override
         */   
        render: function() {
            var self = this, 
                view,
                tableView,
                tableRowView,
                textView,
                actionElement,
                actionElementContainer,
                actionPaddingLeft = 2
                ;

            self.getRenderedCanvas = function() {
                return view;
            };

            view = new Element('div', {
                id: self.getId() + '-view'
            });
            view.setStyles({
                display: 'block',
                position: 'absolute',
                left: Util.pixels(self.location.getX()),
                top: Util.pixels(self.location.getY())
            });

            tableView = (new Element('table', {
                cellSpacing: '0px',
                cellPadding: '0px'
            })).inject(view);

            tableRowView = (new Element('tr')).inject(tableView);

            textView = (new Element('div', {
                html: Util.htmlEntities(self.text)
            })).inject((new Element('td', {
                style: RC.UI.Message('max-width: {0};', Util.pixels(self.viewConfig.maxWidth - 
                    self.viewConfig.actionWidth * self.actions.length))
            })).inject(tableRowView));
            textView.setStyles({
                fontFamily: self.viewConfig.fontFamily,
                fontSize: Util.pixels(self.viewConfig.fontSize),
                backgroundColor: self.viewConfig.backgroundColor,
                color: self.viewConfig.color,
                height: Util.pixels(self.viewConfig.height),
                lineHeight: Util.pixels(self.viewConfig.height),
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'pre',
                border: '1px',
                borderRadius: '4px',
                padding: Util.pixels(self.viewConfig.padding)
            });   
            Util.enableSmartTooltip(textView);
  
            self.actions.each(function(action) {
                actionElement = (new Element('div', {
                    html: action.html,
                    title: action.title,
                    'class': action.className
                }));
                action.styles && actionElement.setStyles(action.styles);
                actionElement.setStyles({
                    fontFamily: self.viewConfig.fontFamily,
                    fontSize: Util.pixels(self.viewConfig.fontSize),
                    cursor: 'pointer'
                })
                actionElementContainer = (new Element('td')).inject(tableRowView);
                actionElementContainer.setStyles({
                    verticalAlign: 'middle',
                    paddingLeft: Util.pixels(actionPaddingLeft),
                    width: Util.pixels(Math.max(self.viewConfig.actionWidth - actionPaddingLeft, 0))
                });
                actionElement.inject(actionElementContainer);
                actionElement.addEvent('click', function() {
                    RC.isFunc(action.handler) && action.handler.call(self);
                });                 
            });      

            return view;
        },
        getId: function() {
            return this.id;
        },
        getLocation: function() {
            var self = this
                ;

            return self.location;
        },
        setLocation: function(location) {
            var self = this,
                view = self._requireView()
                ;

            self.location = location;
            view.setStyles({
                left: location.getX(),
                top: location.getY()
            });
        },      
        getDimension: function() {
            var self = this,
                view = self._requireView()
                ;

            return Dimension.fromElement(view);
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
                var size = element.getSize(),
                    copy
                    ;

                if (size.x == 0 && size.y == 0) {
                    copy = element.clone();
                    copy.setStyles({
                        visibility: 'hidden'
                    });
                    copy.inject($(document.body));
                    size = copy.getSize();
                    copy.destroy();
                }

                return new Dimension(size.x, size.y);
            },
            fromElementContent: function(element, paddings, borderWidths) {
                var dimension,
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

                dimension = Dimension.fromElement(element);
                leftBorderWidth = Util.choosePixels(borderWidths.left, element.getStyle('border-left-width'));
                leftPadding = Util.choosePixels(paddings.left, element.getStyle('padding-left'));
                rightBorderWidth = Util.choosePixels(borderWidths.right, element.getStyle('border-right-width'));
                rightPadding = Util.choosePixels(paddings.right, element.getStyle('padding-right'));
                topBorderWidth = Util.choosePixels(borderWidths.top, element.getStyle('border-top-width'));
                topPadding = Util.choosePixels(paddings.top, element.getStyle('padding-top'));
                bottomBorderWidth = Util.choosePixels(borderWidths.bottom, element.getStyle('border-bottom-width'));
                bottomPadding = Util.choosePixels(paddings.bottom, element.getStyle('padding-bottom'));
                        
                width = dimension.getWidth() - leftBorderWidth - leftPadding - rightBorderWidth - rightPadding;
                height = dimension.getHeight() - topBorderWidth - topPadding - bottomBorderWidth - bottomPadding;

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

