define([
    "dojo",
    "dojo/_base/declare",
],
    function (dojo, declare) {
        var PrefHandler = declare("bgagame.PrefHandler", null, {
            constructor(gameui, prefNameToIndex) {
                Object.assign(this, {gameui, prefNameToIndex});

				this.gameui.onGameUserPreferenceChanged = (prefIndex, prefValue) => { this.onGameUserPreferenceChanged(prefIndex, prefValue); };
            },

            onGameUserPreferenceChanged(prefIndex, prefValue){
				this.gameui.prefs[prefIndex].value = prefValue.toString();
				
            	switch (prefIndex) {
	                case 100:
	                    this.gameui.backgroundHandler.walkingCharactersPreferenceChanged(parseInt(prefValue) == 1);
	                break;
	            }
            },

            getNumericPrefIndex(prefIndex, newValue) {
            	if(this.gameui.prefs.hasOwnProperty(prefIndex))
            		return prefIndex;
            	else if(this.prefNameToIndex.hasOwnProperty(prefIndex))
            		return this.prefNameToIndex[prefIndex];
            	return null;
            },

            setPref(prefIndex, newValue) {
            	prefIndex = this.getNumericPrefIndex(prefIndex);

				var optionSel = 'option[value="' + newValue + '"]';
				dojo.query('#preference_control_' + prefIndex + ' > ' + optionSel + ', #preference_fontrol_' + prefIndex + ' > ' + optionSel).attr('selected', true);

				this.gameui.prefs[prefIndex].value = newValue.toString();

				var select = $('preference_control_' + prefIndex);
				if(dojo.isIE)
					select.fireEvent('onchange');
				else {
					var event = document.createEvent('HTMLEvents');
					event.initEvent('change', false, true);
					select.dispatchEvent(event);
				}
		    },

            getPref(prefIndex) {
            	prefIndex = this.getNumericPrefIndex(prefIndex);
            	if(prefIndex === null)
            		return null;
            	return parseInt(this.gameui.prefs[prefIndex].value);
		    }
        });
    });
