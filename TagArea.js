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
        constructor: function() {
            RC.form.TagArea.superclass.constructor.apply(this, arguments);
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
                resize: 'none'
            });
            textarea.inject(view);
            textarea.addEvent('newTagIsGoingToBeCreated', function(event) {
                event.preventDefault();
                
                var text = textarea.getProperty('value'),
                    tag = new Tag(text, null),
                    tagLocation;

                tag.compile(view);
                tagLocation = calculateTagLocation(self, tag);
                tag.setLocation(tagLocation);
                textarea.setProperty('value', '');
            });

            return view;
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
        setLocation: function(location) {
            var self = this,
                view = self.getRenderedCanvas();
            view && view.setStyles({
                left: location.getX(),
                top: location.getY()
            });
        }

    });

    var Location = new Class({
        GetterSetter: ['x', 'y'],
        initialize: function() {
            this.setX(0);
            this.setY(0);
        }
    });

    var Dimension = new Class({
        width: 0,
        height: 0
    });

    function calculateTagLocation(tagArea, tag) {
        return new Location();
    }

    function calculateTagDimension(tagArea, tag) {
        return new Dimension();
    }

})();

RC.reg('x-form-tagarea', RC.form.TagArea);

