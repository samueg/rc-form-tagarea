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
                tags: new RC.MixedCollection()
            });

            RC.form.TagArea.superclass.constructor.apply(this, [config]);
        },
        render: function() {
            var self = this,
                view,
                textarea;

            view = new Element('div');
            view.setStyles({
                position: 'relative'
            });

            textarea = new Element('textarea');
            textarea.setStyles({
                resize: 'none',
                padding: pixels(self.fixedPadding)
            });
            textarea.inject(view);
            textarea.addEvent('newTagIsGoingToBeCreated', function(event) {
                event.preventDefault();
                
                var text = textarea.getProperty('value'),
                    tag = new Tag(text, null),
                    tagLocation;

                tag.compile(view);
                tagLocation = self._calculateNewTagLocation();
                tag.setLocation(tagLocation);
                textarea.setProperty('value', '');

                self.tags.add(tag);
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
            if (view) {
                return view.getElement();
            }
        },
        _getContentDimension: function() {
            var self = this,
                result,
                view = self.getRenderedCanvas(),
                size,
                width,
                height
                ;

            if (view) {
                size = view.getElement('textarea').getSize();
                width = size.x - (self.fixedPadding * 2);
                height = size.y - (self.fixedPadding * 2);
                result = new Dimension(width, height);
            }

            return result;
        },
        _calculateAvailableWidth: function() {

        },
        _calculateNewTagLocation: function() {
            var self = this,
                lastTag,
                location,
                dimension,
                result = new Location();
                ;

            if (self.tags.length == 0) {
                result = result.offset(self.fixedPadding, self.fixedPadding);
            } else {
                lastTag = self.tags.last();
                location = lastTag.getLocation();
                dimension = lastTag.getDimension();
                result = result.offset(location).offset(dimension.getWidth()).offset(self.tagSpacing);
            }

            return result;
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
                result,
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
        getDimension: function() {
            var self = this,
                result,
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

})();

RC.reg('x-form-tagarea', RC.form.TagArea);

