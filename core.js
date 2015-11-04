(function() {
    var reader = {},
        supported = ['woff', 'woff2', 'ttf'],
        css_path,
        style = document.createElement('style'),
        list_container,
        files = [],
        font_name,
        font_css = '',
        font_list = [],
        typingTimer = {},
        doneTypingInterval = 2000,
        TAB = "\t",
        BR = "\n",

        bytesToSize = function(bytes, precision) {
            var kilobyte = 1024;
            var megabyte = kilobyte * 1024;
            var gigabyte = megabyte * 1024;
            var terabyte = gigabyte * 1024;

            if ((bytes >= 0) && (bytes < kilobyte)) {
                return bytes + ' B';

            } else if ((bytes >= kilobyte) && (bytes < megabyte)) {
                return (bytes / kilobyte).toFixed(precision) + ' KB';

            } else if ((bytes >= megabyte) && (bytes < gigabyte)) {
                return (bytes / megabyte).toFixed(precision) + ' MB';

            } else if ((bytes >= gigabyte) && (bytes < terabyte)) {
                return (bytes / gigabyte).toFixed(precision) + ' GB';

            } else if (bytes >= terabyte) {
                return (bytes / terabyte).toFixed(precision) + ' TB';

            } else {
                return bytes + ' B';
            }
        },

        byteCount = function(s) {
            return encodeURI(s).split(/%..|./).length - 1;
        },

        injectRawStyle = function(text) {
            style.innerHTML = text;
        },

        FileDragHover = function(e) {
            e.stopPropagation();
            e.preventDefault();
            e.target.className = (e.type === "dragover" ? "hover" : "");
        },

        fileNameIsGood = function(filename) {
            // not in supported array
            if (supported.indexOf(filename.split('.').pop()) === -1) {
                return false;
            }
            // check if already in list
            if (font_list.some(function(font) {
                return font.filename === filename;
            })) {
                return false;
            }

            return true; // everythig alright
        },

        getMime = function(ext) {
            switch(ext) {
                case 'ttf':
                    return 'application/x-font-ttf';
                case 'woff':
                    return 'application/font-woff';
                case 'woff2':
                    return 'application/font-woff2';
                case 'svg':
                    return 'image/svg+xml';
                default:
                    return 'font/truetype'; // font/opentype??
            }
        },

        getFormat = function(ext) {
            switch(ext) {
                case 'ttf':
                    return 'truetype';
                case 'woff':
                    return 'woff';
                case 'woff2':
                    return 'woff2';
                case 'svg':
                    return 'svg';
                case 'eot':
                    return 'eot';
                default:
                    return 'truetype';
            }
        },

        fontFamilyName = function(filename) {
            var name = filename.replace(/\..+$/, ''); // remove extension
            name = name.replace(/(bold)/i, ''); // remove "bold"
            name = name.replace(/-/g, ''); // remove hyphens
            return name;
        },

        base64Encode = function(str) {
            var CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
            var out = "", i = 0, len = str.length, c1, c2, c3;
            while (i < len) {
                c1 = str.charCodeAt(i++) & 0xff;
                if (i === len) {
                  out += CHARS.charAt(c1 >> 2);
                  out += CHARS.charAt((c1 & 0x3) << 4);
                  out += "==";
                  break;
                }
                c2 = str.charCodeAt(i++);
                if (i === len) {
                  out += CHARS.charAt(c1 >> 2);
                  out += CHARS.charAt(((c1 & 0x3)<< 4) | ((c2 & 0xF0) >> 4));
                  out += CHARS.charAt((c2 & 0xF) << 2);
                  out += "=";
                  break;
                }
                c3 = str.charCodeAt(i++);
                out += CHARS.charAt(c1 >> 2);
                out += CHARS.charAt(((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4));
                out += CHARS.charAt(((c2 & 0xF) << 2) | ((c3 & 0xC0) >> 6));
                out += CHARS.charAt(c3 & 0x3F);
            }
            return out;
        },

        buildCss = function() {
            var testStyle = '',
                tabChar = "\t",
                brChar = "\n";

            font_css = ''; // reset CSS

            if (!document.getElementById("nominifycss").checked) {
                tabChar = '';
                brChar = '';
            }

            font_list.forEach(function(font, index) {
                font_css += "@font-face{" + brChar +
                    tabChar + "font-family: '" + font_name.value + "';" + brChar +
                    tabChar + "font-weight: " + font.weight + ";" + brChar +
                    tabChar + "font-style: " + font.style + ";" + brChar +
                    tabChar + "src:url(data:" + font.mime + ";" +
                        "charset=utf-8;base64," + font.base64 +
                        ") format('" + font.format + "');" + brChar +
                "}" + brChar;

                // .normal0500woff {}
                testStyle += "." + font.style + index + font.weight + font.extension + "{" +
                    tabChar + "font-family: '" + font_name.value + "', serif;" + brChar +
                    tabChar + "font-weight: " + font.weight + ";" + brChar +
                    tabChar + "font-style: " + font.style + ";" + brChar +
                "}";
            });

            // Paste generated CSS
            document.getElementById("outputcss").value = font_css;
            // Calculate its size
            document.getElementById("csssize").innerHTML = "(" + bytesToSize(byteCount(font_css)) + ")";
            // Inject test and generated CSS
            injectRawStyle(font_css + testStyle);

            // Add done state
            document.querySelector('.fontform').classList.add('done');
            document.querySelector('.output-wrap').classList.add('done');
            document.querySelector('body').classList.add('done');
        },

        doneTyping = function(index, el, val) {

            if(el === "familyname") buildCss();

            // If the value has changed, update it
            else if(font_list[index][el] !== val.value) {
                font_list[index][el] = val.value;
                updateFonts();
            }
        },

        typingReset = function() {
            clearTimeout(typingTimer);
        },

        typing = function(index, el, val) {
            typingReset();
            typingTimer = setTimeout(function() {
                doneTyping(index, el, val);
            }, doneTypingInterval);
        },

        clearAll = function() {
            // Remove done states
            document.querySelector('.fontform').classList.remove('done');
            document.querySelector('.output-wrap').classList.remove('done');
            document.querySelector('body').classList.remove('done');

            setTimeout(function() {
                font_list = [];
                updateFonts();
                document.querySelector('.fontform').classList.remove('done');
                document.querySelector('.output-wrap').classList.remove('done');
                document.querySelector('body').classList.remove('done');

                document.getElementById('font_family').innerHTML = '';
                document.getElementById('csssize').innerHTML = '';
                font_name = undefined;

                css_path.innerHTML = '/font.css';
                updatePath();

            }, 900); // let the effect finish before actually remove the data

            return;
        },

        updateFonts = function() {
            // Sorting
            var compare_list = [];
            if (font_list.constructor === Array) {
                compare_list = font_list.splice();
            }

            font_list.sort(function(a, b) {
                if (a.weight-b.weight) {
                    return a.weight-b.weight
                } else{
                 if (a.style > b.style) return -1;
                 else if (a.style < b.style) return 1;
                }
            })
            if (!compare_list.length || compare_list !== font_list) {
                buildFontsForm();
                buildCss();
            }
        },

        buildFontsForm = function() {
            list_container.innerHTML = '';

            font_list.forEach(function(font, index) {
                var row = document.createElement('div');
                row.classList.add('font');

                var name = document.createElement('div');
                name.classList.add('font__demo');
                name.innerHTML = "Demo: " + font.filename + " - Lorem ipsum dolor sit amet, consectetur adipiscing elit.";

                var mime = document.createElement('input');
                mime.classList.add('field');
                mime.value = font.mime;
                mime.addEventListener('keyup', function() {
                   typing(index, "mime", this);
                }, false);
                mime.addEventListener('keydown', typingReset, false);

                var style = document.createElement('input');
                style.classList.add('field');
                style.placeholder = "normal";
                style.value = font.style;
                style.addEventListener('keyup', function() {
                    typing(index, "style", this);
                }, false);
                style.addEventListener('keydown', typingReset, false);

                var weight = document.createElement('input');
                weight.classList.add('field');
                weight.type = "number";
                weight.step = 100;
                weight.placeholder = "500";
                weight.value = font.weight;
                weight.addEventListener('keyup', function() {
                    typing(index, "weight", this);
                }, false);
                weight.addEventListener('keydown', typingReset, false);

                // Delete button
                var butDelete = document.createElement('button');
                butDelete.classList.add('field');
                butDelete.innerHTML = 'Remove';
                butDelete.addEventListener("click", function() {
                    this.parentNode.parentNode.removeChild(this.parentNode); // remove from HTML
                    if (font_list.indexOf(font) > -1) {
                        font_list.splice(font_list.indexOf(font), 1); // remove from array
                    }
                    updateFonts();

                    if (font_list.length === 0) {
                        //remove if no fonts??
                        clearAll();
                    }
                });

                // Demo class
                row.classList.add(font.style + index + font.weight + font.extension);

                row.appendChild(name);
                row.appendChild(mime);
                row.appendChild(weight);
                row.appendChild(style);
                row.appendChild(butDelete);

                font.data = row;

                list_container.appendChild(font.data);
            });
            return;
        },

        buildForm = function() {

            // Build font family bit
            if (font_name === undefined) {
                font_name = document.createElement('input');
                font_name.placeholder = "Set to localFont for extra fun.";
                font_name.value = fontFamilyName(font_list[0].filename) || "Family name"; // default font family name to first file name uploaded
                font_name.addEventListener('keyup', function() {
                    typing(0, "familyname", this);
                }, false);
                font_name.addEventListener('keydown', typingReset, false);
                document.getElementById('font_family').appendChild(font_name);
            }

            updateFonts();

            return;
        },
        readFile = function(index) {
            if (index === font_list.length) {
                // done reading
                buildForm();
            }
            else if( index > font_list.length ) return; // all done
            else {
                var file = font_list[index].file;
                reader.onload = function(e) {
                    // get file content
                    var binaryString = e.target.result;
                    font_list[index].base64 = base64Encode(binaryString);

                    // do sth with bin

                    readFile(index+1);
                }
                reader.readAsBinaryString(font_list[index].file);
            }
        },
        newFont = function(file) {

            var current_font = {}; // new font

            current_font.file = file;
            current_font.filename = file.name;
            current_font.extension = file.name.split('.').pop();
            current_font.mime = getMime(current_font.extension);
            current_font.format = getFormat(current_font.extension);
            current_font.style = "normal";
            if (/(italic)/i.test(file.name)) current_font.style = "italic";

            current_font.weight = 500;
            if (/(light)/i.test(file.name)) current_font.weight = 300;
            if (/(book)/i.test(file.name)) current_font.weight = 400;
            if (/(demi)/i.test(file.name)) current_font.weight = 600;
            if (/(bold)/i.test(file.name)) current_font.weight = 700;
            if (/(heavy)/i.test(file.name)) current_font.weight = 800;
            if (/(extrabold)/i.test(file.name)) current_font.weight = 800;

            font_list.push(current_font);

            return;
        },
        handleFileSelect = function(evt) {
            var indexReader = font_list.length || 0;
            var launchReader = false;
            list_container = document.getElementById("font_list");
            FileDragHover(evt);

            files = evt.dataTransfer.files;

            if (files) {

                reader = new FileReader();

                for (var i = 0; i < files.length; i++) {
                    if (fileNameIsGood(files[i].name)) {
                        newFont(files[i]);
                        launchReader = true;
                    }
                }
                if (launchReader) readFile(indexReader); // launch file reader
            }
        },
        updatePath = function() {
            // update visual representation
            document.getElementById('pathspan').innerHTML = css_path.value;
            // update JS
            if (!(/\.(css)$/i).test(css_path.value)) {
                document.getElementById('outputjs').value = 'I need a *.css file in order to work!';
            } else {
                // Unminified version available on launcher.html
                document.getElementById('outputjs').value = '\<script type="text\/javascript"\>!function(){"use strict";function e(e,t,n){e.addEventListener?e.addEventListener(t,n,!1):e.attachEvent&&e.attachEvent("on"+t,n)}function t(e){return window.localStorage&&localStorage.font_css_cache&&localStorage.font_css_cache_file===e}function n(){if(window.localStorage&&window.XMLHttpRequest)if(t(o))c(localStorage.font_css_cache);else{var n=new XMLHttpRequest;n.open("GET",o,!0),e(n,"load",function(){4===n.readyState&&(c(n.responseText),localStorage.font_css_cache=n.responseText,localStorage.font_css_cache_file=o)}),n.send()}else{var a=document.createElement("link");a.href=o,a.rel="stylesheet",a.type="text/css",document.getElementsByTagName("head")[0].appendChild(a),document.cookie="font_css_cache"}}function c(e){var t=document.createElement("style");t.innerHTML=e,document.getElementsByTagName("head")[0].appendChild(t)}var o="' +
                    "/" + css_path.value +
                    '";window.localStorage&&localStorage.font_css_cache||document.cookie.indexOf("font_css_cache")>-1?n():e(window,"load",n)}();\<\/script\>\<noscript\>\<link rel="stylesheet" href="' +
                    "/" + css_path.value +
                    '"\>\<\/noscript\>';
            }
            return;
        },
        init = function() {
            // Let´s get the style started
            document.getElementsByTagName('head')[0].appendChild(style);

            // Drop file area activated
            document.getElementById('filedrag').addEventListener("dragover", FileDragHover, false);
            document.getElementById('filedrag').addEventListener("dragleave", FileDragHover, false);
            document.getElementById('fileselect').addEventListener('change', handleFileSelect, false);
            document.getElementById('filedrag').addEventListener("drop", handleFileSelect, false);

            // Stuff changes across the page with these actions
            document.getElementById('nominifycss').addEventListener("change", buildCss, false);
            document.getElementById('clearAll').addEventListener("click", clearAll, false);
            css_path = document.getElementById('css_path');
            css_path.addEventListener("keyup", updatePath, false);

            // Hide stuff to animate on show, hooray!
            document.querySelector('.fontform').classList.add('hidden');
            document.querySelector('.output-wrap').classList.add('hidden');
        };

    document.addEventListener('DOMContentLoaded', function() {
        if (window.File && window.FileReader && window.FileList && window.Blob) {
            init();
        } else {
            alert('The File APIs are not fully supported in this browser.');
        }
    });
})();
