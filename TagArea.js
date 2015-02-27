(function() {
    Element.Events.newTagIsGoingToBeCreated = {
        base: 'keypress',
        condition: function(event) {
            return 'enter' == event.key;
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

    RC.form.TagArea = RC.extend(RC.form.Field, {
        constructor: function(config) {
            config = config || {};
            RC.apply(config, {
                fixedPadding: 10,
                tagSpacing: 5,
                tags: new RC.MixedCollection(),
                minHeight: 100,
                maxHeight: 400
            });

            RC.form.TagArea.superclass.constructor.apply(this, [config]);
        },
        render: function() {
            var self = this,
                view,
                textarea;

            view = new Element('div');
            view.setStyles({
                position: 'relative',
                height: pixels(self.minHeight)
            });

            textarea = new Element('textarea');
            textarea.setStyles({
                resize: 'none',
                padding: pixels(self.fixedPadding),
                boxSizing: 'border-box',
                width: '100%',
                height: '100%'
            });
            textarea.inject(view);
            textarea.addEvent('newTagIsGoingToBeCreated', function(event) {
                event.preventDefault();
                
                var text = textarea.getProperty('value'),
                    tag = new Tag(text, null),
                    tagLocation,
                    cursorLocation;

                tag.compile(view);
                tagLocation = self._calculateNewTagLocation();
                tag.setLocation(tagLocation);

                textarea.setProperty('value', '');
                cursorLocation = tag.getTailLocation().offset(self.tagSpacing);
                self._updateCursorLocation(cursorLocation);

                self.tags.add(tag);
            });
            textarea.addEvent('keyup', function(event) {
                var value,
                    availableWidth,
                    maxAvailableWidth,
                    valueWidth,
                    referredTag,
                    cursorLocation
                    ;

                value = textarea.getProperty('value');
                availableWidth = self._getAvailableWidth();
                maxAvailableWidth = self._getMaxAvailableWidth();
                valueWidth = self._calculateWidthOfAString(value);
                if (self.tags.length > 0 && availableWidth != maxAvailableWidth && availableWidth < valueWidth) {
                    referredTag = self.tags.last();
                    cursorLocation = referredTag.getLocation().offset(0, referredTag.getDimension().getHeight())
                        .offset(0, self.tagSpacing).setX(self.fixedPadding);
                    self._updateCursorLocation(cursorLocation);
                }
            });

            return view;
        },
        getId: function() {
            return this.id;
        },
        _getTextArea: function() {
            var self = this,
                view = self.getRenderedCanvas()
                ;

            return view ? view.getElement('textarea') : null;
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
                    html: aString,
                });
                ruler.setStyles({
                    visibility: 'hidden',
                    position: 'absolute',
                    whiteSpace: 'nowrap'
                });
                ruler.inject(view);
                result = ruler.getSize().x;
                ruler.dispose();

            }

            return result;

            function getRulerId() {
                return self.getId() + '-ruler';
            }

        },
        _calculateNewTagLocation: function() {
            var self = this,
                result,
                textarea
                ;

            result = new Location();
            textarea = self._getTextArea();
            if (textarea) {
                result = result.offset(getContentLocation(textarea));
            }
            return result;
        },
        _updateCursorLocation: function(cursorLocation) {
            var self = this,
                textarea
                ;

            textarea = self._getTextArea();
            if (textarea) {
                textarea.setStyles({
                    paddingLeft: pixels(cursorLocation.getX()),
                    paddingTop: pixels(cursorLocation.getY())
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

