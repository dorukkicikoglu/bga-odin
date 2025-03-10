define([
    "dojo",
    "dojo/_base/declare",
],
    function (dojo, declare) {
        var BackgroundHandler = declare("bgagame.BackgroundHandler", null, {
            constructor(gameui, goatEnabled) {
            	this.gameui = gameui;
            	this.goatEnabled = goatEnabled;

                this.backgroundContainer = false;
                this.captainDirection = false;
                this.captain = false;
                this.walkingAnimationOn = false;
                this.walkingTimeout = false;

            	this.displayBackground();
            },

            displayBackground(){
                this.backgroundContainer = dojo.place(dojo.string.substitute(jstpl_background_container, {left_character: this.goatEnabled ? 'bg-goat' : 'bg-berserker bg-breathing-1'}), dojo.body(), 'first');

                this.captain = dojo.query('.bg-captain', this.backgroundContainer)[0];
            },

            setCaptainTime(){
                this.captainDirection = (this.captainDirection) ? (3 - this.captainDirection) : 1 + parseInt(Math.random() * 2);

                var time = 60 + (Math.random() * 20);
                var minTime = this.gameui.getPos(dojo.body()).w / 18;

                time = Math.max(minTime, time);

                dojo.attr(this.captain, 'move-direction', this.captainDirection == 1 ? 'right' : 'left'); //1 goes right, 2 goes left
                dojo.attr(this.captain, 'stopped', 'false');

                this.captain.style.setProperty('--walking-time', time + 's');

                this.walkingTimeout = setTimeout(() => { this.setCaptainTime(); }, time * 1000);
            },

            walkingCharactersPreferenceChanged(pref_value){
                if(this.walkingAnimationOn === pref_value)
                    return;

                this.walkingAnimationOn = pref_value;

                if(pref_value){
                    this.setCaptainTime();
                    return;
                }

                clearTimeout(this.walkingTimeout);
                this.walkingTimeout = false;

                this.captain.style.left = this.gameui.getPos(this.captain).x + 'px';
                dojo.attr(this.captain, 'stopped', 'true');
            }
        });
    });
