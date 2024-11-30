<?php

class GlobalsManager extends APP_DbObject{
    function __construct($parent, $globalKeys, $userPrefs = []) {
        $this->parent = $parent;
        $this->globalKeys = $globalKeys;
        $this->userPrefs = $userPrefs;

        $this->parent->initGameStateLabels($globalKeys);
    }

    function initValues($values){
        foreach($values as $field => $val)
            $this->parent->setGameStateInitialValue($field, $val);
    }

    function getAllValues(){
        $values = array();

        foreach($this->globalKeys as $index => $field)
            $values[$index] = $this->get($index);

        return $values;
    }

    function setValues($newValues){
        foreach($newValues as $field => $val)
            $this->set($field, $val);
    }

    function get($key) { return $this->parent->getGameStateValue($key); }
    function set($key, $newVal) { $this->parent->setGameStateValue($key, $newVal); }
    function getPref($key, $playerID) { return (int) $this->getUniqueValueFromDB("SELECT pgp_value FROM bga_user_preferences WHERE pgp_preference_id = '".$this->userPrefs[$key]."' AND pgp_player = $playerID"); }
}

?>