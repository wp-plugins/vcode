;
(function ($, exports) {
    var ua = (window.navigator.userAgent || "").toLowerCase();
    var isIE6 = ua.indexOf("msie 6") !== -1;

    var klass = exports.klass = function (Parent, props) {
        var Child, F, i;
        Child = function () {
            /*  if (Child.uber && Child.uber.hasOwnProperty("__construct")) {
             Child.uber.__construct.apply(this, arguments);
             }*/
            if (Child.prototype.hasOwnProperty("__construct")) {
                Child.prototype.__construct.apply(this, arguments);
            }

        };
        Parent = Parent || Object;
        F = function () {
        };
        F.prototype = Parent.prototype;
        Child.prototype = new F();
        Child.uber = Parent.prototype;
        Child.prototype.constructor = Child;
        for (i in props) {
            if (props.hasOwnProperty(i)) {
                Child.prototype[i] = props[i];
            }
        }
        return Child;
    };

    //events
    var Events = (function () {
        var eventSplitter = /\s+/;

        function Events() {
        }

        Events.prototype.on = function (events, callback, context) {
            var cache, event, list;
            if (!callback) return this;
            cache = this.__events || (this.__events = {});
            events = events.split(eventSplitter);
            while (event = events.shift()) {
                list = cache[event] || (cache[event] = []);
                list.push(callback, context);
            }
            return this;
        };
        Events.prototype.off = function (events, callback, context) {
            var cache, event, list, i;

            if (!(cache = this.__events)) return this;
            if (!(events || callback || context)) {
                delete this.__events;
                return this;
            }
            events = events ? events.split(eventSplitter) : keys(cache);

            while (event = events.shift()) {
                list = cache[event];
                if (!list) continue;
                if (!(callback || context)) {
                    delete cache[event];
                    continue;
                }
                for (i = list.length - 2; i >= 0; i -= 2) {
                    if (!(callback && list[i] !== callback || context && list[i + 1] !== context)) {
                        list.splice(i, 2);
                    }
                }
            }
            return this;
        };

        Events.prototype.trigger = function (events) {
            var cache, event, all, list, i, len, rest = [], args, returned = {
                status: true
            };
            if (!(cache = this.__events)) return this;
            events = events.split(eventSplitter);

            for (i = 1, len = arguments.length; i < len; i++) {
                rest[i - 1] = arguments[i];
            }

            while (event = events.shift()) {

                if (all = cache.all) all = all.slice();
                if (list = cache[event]) list = list.slice();

                callEach(list, rest, this, returned);

                callEach(all, [event].concat(rest), this, returned);
            }
            return returned.status;
        };

        Events.mixTo = function (receiver) {
            receiver = receiver.prototype || receiver;
            var proto = Events.prototype;
            for (var p in proto) {
                if (proto.hasOwnProperty(p)) {
                    receiver[p] = proto[p];
                }
            }
        };
        var keys = Object.keys;
        if (!keys) {
            keys = function (o) {
                var result = [];
                for (var name in o) {
                    if (o.hasOwnProperty(name)) {
                        result.push(name);
                    }
                }
                return result;
            };
        }

        function callEach(list, args, context, returned) {
            var r;
            if (list) {
                for (var i = 0, len = list.length; i < len; i += 2) {
                    r = list[i].apply(list[i + 1] || context, args);
                    r === false && returned.status && (returned.status = false);
                }
            }
        }

        return Events;

    }());

    //Aspect
    var Aspect = (function () {
        var Aspect = {};

        Aspect.before = function (methodName, callback, context) {
            return weave.call(this, "before", methodName, callback, context);
        };

        Aspect.after = function (methodName, callback, context) {
            return weave.call(this, "after", methodName, callback, context);
        };

        var eventSplitter = /\s+/;

        function weave(when, methodName, callback, context) {
            var names = methodName.split(eventSplitter);
            var name, method;
            while (name = names.shift()) {
                method = getMethod(this, name);
                if (!method.__isAspected) {
                    wrap.call(this, name);
                }
                this.on(when + ":" + name, callback, context);
            }
            return this;
        }

        function getMethod(host, methodName) {
            var method = host[methodName];
            if (!method) {
                throw new Error("Invalid method name: " + methodName);
            }
            return method;
        }

        function wrap(methodName) {
            var old = this[methodName];
            this[methodName] = function () {
                var args = Array.prototype.slice.call(arguments);
                var beforeArgs = ["before:" + methodName].concat(args);
                // prevent if trigger return false
                if (this.trigger.apply(this, beforeArgs) === false) return;
                var ret = old.apply(this, arguments);
                var afterArgs = ["after:" + methodName, ret].concat(args);
                this.trigger.apply(this, afterArgs);
                return ret;
            };
            this[methodName].__isAspected = true;
        }

        return Aspect;
    }());

    //Position
    var Position = (function () {
        var Position = {},
            VIEWPORT = {
                _id: "VIEWPORT",
                nodeType: 1
            },
            isPinFixed = false,
            ua = (window.navigator.userAgent || "").toLowerCase(),
            isIE6 = ua.indexOf("msie 6") !== -1;

        Position.pin = function (pinObject, baseObject) {

            pinObject = normalize(pinObject);
            baseObject = normalize(baseObject);
            var pinElement = $(pinObject.element);
            if (pinElement.css("position") !== "fixed" || isIE6) {
                pinElement.css("position", "absolute");
                isPinFixed = false;
            } else {
                isPinFixed = true;
            }
            posConverter(pinObject);
            posConverter(baseObject);
            var parentOffset = getParentOffset(pinElement);
            var baseOffset = baseObject.offset();

            var top = baseOffset.top + baseObject.y - pinObject.y - parentOffset.top;
            var left = baseOffset.left + baseObject.x - pinObject.x - parentOffset.left;

            pinElement.css({
                left: left,
                top: top
            });
        };
        Position.center = function (pinElement, baseElement) {
            Position.pin({
                element: pinElement,
                x: "50%",
                y: "50%"
            }, {
                element: baseElement,
                x: "50%",
                y: "50%"
            });
        };
        Position.VIEWPORT = VIEWPORT;
        function normalize(posObject) {
            posObject = toElement(posObject) || {};
            if (posObject.nodeType) {
                posObject = {
                    element: posObject
                };
            }
            var element = toElement(posObject.element) || VIEWPORT;
            if (element.nodeType !== 1) {
                throw new Error("posObject.element is invalid.");
            }
            var result = {
                element: element,
                x: posObject.x || 0,
                y: posObject.y || 0
            };

            var isVIEWPORT = element === VIEWPORT || element._id === "VIEWPORT";

            result.offset = function () {
                if (isPinFixed) {
                    return {
                        left: 0,
                        top: 0
                    };
                } else if (isVIEWPORT) {
                    return {
                        left: $(document).scrollLeft(),
                        top: $(document).scrollTop()
                    };
                } else {
                    return getOffset($(element)[0]);
                }
            };
            result.size = function () {
                var el = isVIEWPORT ? $(window) : $(element);
                return {
                    width: el.outerWidth(),
                    height: el.outerHeight()
                };
            };
            return result;
        }

        // 对 x, y 两个参数为 left|center|right|%|px 时的处理，全部处理为纯数字
        function posConverter(pinObject) {
            pinObject.x = xyConverter(pinObject.x, pinObject, "width");
            pinObject.y = xyConverter(pinObject.y, pinObject, "height");
        }


        function xyConverter(x, pinObject, type) {
            x = x + "";
            x = x.replace(/px/gi, "");
            if (/\D/.test(x)) {
                x = x.replace(/(?:top|left)/gi, "0%").replace(/center/gi, "50%").replace(/(?:bottom|right)/gi, "100%");
            }
            if (x.indexOf("%") !== -1) {
                x = x.replace(/(\d+(?:\.\d+)?)%/gi, function (m, d) {
                    return pinObject.size()[type] * (d / 100);
                });
            }
            if (/[+\-*\/]/.test(x)) {
                try {
                    x = new Function("return " + x)();
                } catch (e) {
                    throw new Error("Invalid position value: " + x);
                }
            }
            return numberize(x);
        }

        function getParentOffset(element) {
            var parent = element.offsetParent();
            if (parent[0] === document.documentElement) {
                parent = $(document.body);
            }
            if (isIE6) {
                parent.css("zoom", 1);
            }
            var offset;

            if (parent[0] === document.body && parent.css("position") === "static") {
                offset = {
                    top: 0,
                    left: 0
                };
            } else {
                offset = getOffset(parent[0]);
            }

            offset.top += numberize(parent.css("border-top-width"));
            offset.left += numberize(parent.css("border-left-width"));
            return offset;
        }

        function numberize(s) {
            return parseFloat(s, 10) || 0;
        }

        function toElement(element) {
            return $(element)[0];
        }

        function getOffset(element) {
            var box = element.getBoundingClientRect(), docElem = document.documentElement;
            return {
                left: box.left + (window.pageXOffset || docElem.scrollLeft) - (docElem.clientLeft || document.body.clientLeft || 0),
                top: box.top + (window.pageYOffset || docElem.scrollTop) - (docElem.clientTop || document.body.clientTop || 0)
            };
        }

        return Position
    }());

    //Vcode
    var Vcode = exports.Vcode = klass(Events, {
        __construct: function (config) {

            this.setting = {
                width: 210,
                tips: '',
                hasCloser: true,
                btns: [],
                style: '',
                id: '',
                size: 6,
                className: '',
                baseElement: document.body,
                hasMask: false,
                oncheckfase: function () {
                },
                onchecktrue: function () {
                },
                template: '<div id="vcode_wrap" class="vcode_wrap">' +
                '<div class="vcode_img_con">' +
                '<img class="vcode_img" >' +
                '</div>' +
                '<div class="vcode_txt_con"></div>' +
                '<div class="vcode_sbm">' +
                '</div>' +
                '</div>'
            };

            if (!config.id) {
                throw  new Error('id 为必选参数')
            }

            $.extend(this.setting, config);

            this.result = false;

            this.id = this.setting.id;
            this.size = this.setting.size;


            this.element = this.__createDom();
            if (this.setting.className) {
                this.element.addClass(this.setting.className);
            }
            this.isShow = false;
            this.value = '';


            this.baseElement = this.setting.baseElement;

            this.img = this.element.find('.vcode_img');
            this.txtCon = this.element.find('.vcode_txt_con');
            this.btnCon = this.element.find('.vcode_sbm');

            //create dom form config
            this.__createDomFromConfig();
            this.__bindESCToClose();

            this.__setStyle();
            this.__setPosition();

            this.__imgShow = false;
            // this.__loadImg();

            this.__bindEvent();

        },
        __createDom: function () {
            var dom = $(this.setting.template);
            if (this.setting.hasCloser) {
                this.closer = $('<a class="vcode_closer">×</a>');
                dom.prepend(this.closer)
            }

            if (this.setting.hasMask) {
                this.mask = this.__createMask();
            }

            dom.hide();
            $(document.body).append(dom);
            this.trigger('ondomready');
            return dom;
        },
        __createDomFromConfig: function () {

            if (this.setting.tips) {
                this.txtCon.html(this.setting.tips);
            }
            if (this.setting.btns && $.isArray(this.setting.btns)) {
                var btnarr = this.setting.btns;
                $.each(btnarr, $.proxy(function (index, btn) {
                    var a = $('<a>');
                    a.addClass((btn.className));
                    a.html(btn.label);
                    if (btn.role) {
                        this.__bindEventByRole(a, btn.role);
                    }
                    this.btnCon.append(a)
                }, this));
            }

        },
        __bindEventByRole: function (btn, role) {
            btn.on('click', $.proxy(this[role], this));
        },
        __setPosition: function () {
            if (this.setting.baseElement == document.body) {
                this.element.css({
                    position: isIE6 ? 'absolute' : 'fixed',
                    top: '30%',
                    left: '50%',
                    marginLeft: '-160px'
                });
            } else {
                this.position({
                    element: this.element,
                    x: 0,
                    y: 0
                }, {
                    element: this.baseElement,
                    x: 0,
                    y: '100%'
                })
            }

        },
        __bindEvent: function () {

            this.closer.on('click.vcode', $.proxy(function () {
                this.hide();
            }, this));
            this.img.on('click.vcode', $.proxy(function () {
                this.change();
            }, this));

            $(window).on('resize.vcode', $.proxy(function () {
                this.hide();
            }, this))

        },
        __createMask: function () {
            var mask = $('<div class="verify_mask"></div>');
            mask.hide();
            $(document.body).append(mask);
            return mask;
        },
        __setStyle: function () {
            this.element.css({
                width: this.setting.width,
                zIndex: 9999
            });
            if (this.mask) {
                this.mask.css({
                    position: isIE6 ? 'absolute' : 'fixed',
                    width: '100%',
                    height: Math.max(document.documentElement.scrollHeight, document.documentElement.clientHeight) + 'px',
                    backgroundColor: '#000',
                    left: 0,
                    top: 0,
                    opacity: 0.1,
                    zIndex: 9998
                })
            }
            return this;
        },
        __bindESCToClose: function () {
            $(document).on('keyup', $.proxy(function (event) {
                if (event.keyCode == 27) {
                    this.hide();
                }
            }, this))
        },

        __destroyImg: function () {
            this.img.attr('src', '');
            this.__imgShow = false;
        },
        __loadImg: function () {
            if (this.__timeGetImg) {
                if ((new Date()).getTime() - this.__timeGetImg > 500) {
                    this.__getImg();
                } else {
                    return this;
                }
            } else {
                this.__getImg();
            }

            this.__imgShow = true;

        },
        __getImg: function () {
            var time = new Date();
            this.__timeGetImg = time.getTime();
            $.getJSON('http://vcode.360sht.com/image?cb=?&id=' + this.id + '&t=' + time.getTime(), $.proxy(function (data) {
                    this.img.attr('src', 'data:image/jpg;base64,' + data.src);
                }, this)
            );
            return this;
        },

        show: function () {
            if (!this.__imgShow) {
                this.__loadImg();
            }
            this.element.show();
            this.mask && this.mask.show();
            this.__setPosition();
            this.isShow = true;
            return this;
        },
        hide: function () {
            this.element.hide();
            this.mask && this.mask.hide();
            this.isShow = false;
            // this.__destroyImg();
            return this;
        },

        destroy: function () {
            this.element.remove();
            this.mask && this.mask.remove();
            for (var p in this) {
                if (this.hasOwnProperty(p)) {
                    delete this[p];
                }
            }
            $(window).off('resize.vcode');
            this.off();
        },
        change: function () {
            this.__loadImg();
            return this;
        },
        position: function (pinObject, baseObject) {
            Position.pin(pinObject, baseObject);
            return this;
        },

        check: function (code, options, checkMore) {
            var options = options || {};
            var more = true,
                lastArg = Array.prototype.slice.call(arguments, arguments.length - 1)[0];
            if (Object.prototype.toString.call(lastArg) == "[object Boolean]") {
                more = lastArg;
            }
            if (more) {
                if (!code || !code.length || Object.prototype.toString.call(code) != '[object String]') {
                    this.result = false;
                    this.trigger('onuncheck');
                    options.uncheck && options.uncheck();
                    return this;
                }

                if (this.value == code) {
                    this.trigger('onuncheck');
                    options.uncheck && options.uncheck();
                    return this;
                }

                if (code.length < this.size) {
                    this.value = '';
                    this.trigger('onuncheck');
                    options.uncheck && options.uncheck();
                    return this;
                }
            }


            $.getJSON('http://vcode.360sht.com/verify?cb=?', {code: code, id: this.id}, $.proxy(function (res) {

                this.value = code;

                if (res.errcode == 0) {
                    this.result = true;
                    options.success && options.success(res.errcode, res.errmsg, res.data);
                    this.setting.onchecktrue(res.errcode, res.errmsg, res.data)
                    this.trigger('onchecktrue', res.errcode, res.errmsg, res.data);


                } else {
                    this.result = false;
                    options.error && options.error(res.errcode, res.errmsg, res.data);
                    this.setting.oncheckfase(res.errcode, res.errmsg, res.data);
                    this.trigger('oncheckfalse', res.errcode, res.errmsg, res.data);
                }

                if (res.errcode == 1004) {

                    this.trigger('onvcodetimeout', res.errcode, res.errmsg, res.data);
                }

            }, this));

            return this;
        }
    });

    // 混入Aspect;
    mixin(Vcode.prototype, Aspect);

    function mixin(r, s, wl) {
        for (var p in s) {
            if (s.hasOwnProperty(p)) {
                if (wl && indexOf(wl, p) === -1) continue;

                if (p !== "prototype") {
                    r[p] = s[p];
                }
            }
        }
    }


    var VcodeLayerBox = exports.VcodeLayerBox = klass(Vcode, {

        __construct: function (options) {
            var config = {
                elementError: '',
                baseInput: '',
                errorHTML: '验证码错误',
                successHTML: '验证码正确'

            };

            if (!options.baseInput) {
                throw  new Error('baseInput 为必选参数')
            }
            if (!options.id) {
                throw  new Error('id 为必选参数')
            }

            var setting = $.extend(config, options);

            this.input = config.baseElement = $(options.baseInput);
            this.noticeCon = $(setting.elementNotice);


            VcodeLayerBox.uber.__construct.call(this, setting);
            this.input.attr('maxlength', this.size);
            this.element.addClass('vcode_min');
            if (this.noticeCon.length) {
                this.defaultHTML = this.noticeCon.html();
            } else {
                this.defaultHTML = this.setting.tips;
            }


        },
        __bindEvent: function () {
            VcodeLayerBox.uber.__bindEvent.call(this);
            this.input.on({
                    'keyup.vcode': $.proxy(function () {
                        if (this.input.val().length == this.size) {
                            this.check(this.input.val());

                        } else {
                            if (this.noticeCon.length) {
                                this.noticeCon.removeClass('error success').html(this.defaultHTML);
                            }
                            if (this.setting.tips.length) {
                                this.txtCon.removeClass('error success').html(this.defaultHTML);
                            }
                            this.input.removeClass('error success');
                            this.value = '';
                        }
                    }, this),
                    'focus.vcode': $.proxy(function () {
                        this.show();
                    }, this),
                    'paste.vcode cut.vcode': $.proxy(function () {
                        return false;
                    }, this)
                }
            );

            this.after('change', $.proxy(function () {
                this.input.val('');
                if (this.noticeCon.length) {
                    this.noticeCon.html(this.defaultHTML);
                }
            }, this));


            this.on('onchecktrue', $.proxy(function (code, message) {
                if (this.noticeCon.length) {
                    this.noticeCon.removeClass('error').addClass('success').html(this.setting.successHTML || message).show();
                }
                if (this.setting.tips.length) {
                    this.txtCon.removeClass('error').addClass('success').html(this.setting.successHTML || message).show();
                }
                this.input.removeClass('error').addClass('success')
            }, this));

            //验证不通过
            this.on('oncheckfalse', $.proxy(function (code, message) {
                if (this.noticeCon.length) {
                    this.noticeCon.removeClass('success').addClass('error').html(this.setting.errorHTML || message).show();
                }
                if (this.setting.tips.length) {
                    this.txtCon.removeClass('success').addClass('error').html(this.setting.errorHTML || message).show();
                }
                this.input.removeClass('success').addClass('error');
            }, this));


        }

    });


    var VcodeEmbed = exports.VcodeEmbed = klass(Vcode, {

        __construct: function (options) {
            var config = {
                baseInput: '',
                elementError: '',
                errorHTML: '验证码错误',
                successHTML: '验证码正确',
                template: ''

            };

            if (!options.baseInput) {
                throw  new Error('baseInput 为必选参数')
            }
            if (!options.id) {
                throw  new Error('id 为必选参数')
            }
            if (!options.wrapImg) {
                throw  new Error('wrapImg 为必选参数');
            }

            var setting = $.extend(config, options);
            this.wrapImg = $(options.wrapImg);

            setting.template = this.wrapImg.html();

            this.input = config.baseElement = $(options.baseInput);
            this.noticeCon = $(setting.elementNotice);
            if (this.noticeCon.length) {
                this.defaultHTML = this.noticeCon.html();
            }

            VcodeEmbed.uber.__construct.call(this, setting);
            this.input.attr('maxlength', this.size);
            this.element.addClass('vcode_embed');
            this.img = this.wrapImg.find('img.vcode_img');
            this.show();

        },

        //重写__createDom
        __createDom: function () {
            var dom = $('<img class="vcode_img" />');
            this.wrapImg.append(dom);
            this.trigger('ondomready');
            return dom;
        },

        //重写__setStyle
        __setStyle: function () {
            this.element.css({
                width: '100%',
                height: '100%'
            });

            return this;
        },
        __setPosition: function () {
        },
        //重写__bindEvent
        __bindEvent: function () {

            this.element.on('click.vcode', $.proxy(function () {
                this.change();
            }, this));

            this.input.on({
                    'keyup.vcode': $.proxy(function () {
                        if (this.input.val().length == this.size) {
                            this.check(this.input.val());

                        } else {
                            this.noticeCon.html(this.defaultHTML);
                            this.value = '';
                        }
                    }, this),
                    'focus.vcode': $.proxy(function () {
                        this.show();
                    }, this),
                    'paste.vcode cut.vcode': $.proxy(function () {
                        return false;
                    }, this)
                }
            );

            this.after('change', $.proxy(function () {
                this.input.val('');
                if (this.noticeCon.length) {
                    this.noticeCon.html(this.defaultHTML);
                }
            }, this));


            if (this.noticeCon.length) {
                this.on('onchecktrue', $.proxy(function (code, message) {
                    this.noticeCon.removeClass('error').addClass('success').html(this.setting.successHTML || message).show();
                }, this));

                //验证不通过
                this.on('oncheckfalse', $.proxy(function (code, message) {
                    this.noticeCon.removeClass('success').addClass('error').html(this.setting.errorHTML || message).show();

                }, this));
            }
        }
    });

}(jQuery, window));

