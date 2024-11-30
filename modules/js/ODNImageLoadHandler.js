define([
    "dojo",
    "dojo/_base/declare",
],
    function (dojo, declare) {
        var ImageLoadHandler = declare("bgagame.ImageLoadHandler", null, {
            constructor(gameui, propNames) {
            	this.gameui = gameui;
                this.images = {};

                var style = getComputedStyle(document.body);
                for(imageTag of propNames){
                    var imageCSSURL = style.getPropertyValue('--image-source-' + imageTag);
                    var imageNameMinified = imageCSSURL.match(/url\((?:'|")?.*\/(.*?)(?:'|")?\)/)[1];

                    var imageName = imageNameMinified.replace('_minified', '');

                    this.gameui.dontPreloadImage(imageName);
                    this.images[imageTag] = {imageName: imageName, loaded: false};
                }

                for(imageTag in this.images)
                    this.loadImage(imageTag);
            },

            loadImage: function(imageTag){
                var imageName = this.images[imageTag].imageName;
                var img = new Image();
                img.src = g_gamethemeurl + 'img/' + imageName;

                img.onerror = function() { console.error('Error loading image: ' + imageName); };
                img.onload = () => {
                    document.documentElement.style.setProperty('--image-source-' + imageTag, 'url(' + img.src + ')');
                    this.images[imageTag].loaded = true;
                };
            }
        });
    });
