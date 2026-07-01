import { LightningElement, api, track, wire } from 'lwc';
import getAllObjects from '@salesforce/apex/ListBoxController.getAllObjects';
import getFieldsByObject from '@salesforce/apex/ListBoxController.getFieldsByObject';

export default class Listboxcpe extends LightningElement {
    @api inputVariables;

    @track allOrgObjects = [];
    @track masterFieldOptions = [];
    
    isFieldsLoading = false;
    isObjectInvalid = false;

    @wire(getAllObjects)
    wiredAllObjects({ error, data }) {
        if (data) {
            this.allOrgObjects = data;
        } else if (error) {
            console.error('Error listing system objects:', error);
        }
    }

    get comboboxOptions() {
        if (!this.allOrgObjects || this.allOrgObjects.length === 0) {
            return [];
        }
        return this.allOrgObjects.map(obj => ({
            label: `${obj.label} (${obj.value})`,
            value: obj.value
        }));
    }

    get objectApiName() {
        if (!this.inputVariables) return '';
        const param = this.inputVariables.find(v => v.name === 'objectApiName');
        return param ? param.value : '';
    }

    get availableFields() {
        if (!this.inputVariables) return [];
        const param = this.inputVariables.find(v => v.name === 'availableFields');
        if (param && param.value) {
            let val = param.value;
            if (typeof val === 'string') {
                try {
                    return JSON.parse(val);
                } catch (e) {
                    return val.split(',').map(s => s.trim());
                }
            }
            return Array.isArray(val) ? val : [val];
        }
        return [];
    }

    get minSelections() {
        if (!this.inputVariables) return '';
        const param = this.inputVariables.find(v => v.name === 'minSelections');
        return param ? param.value : '';
    }

    get maxSelections() {
        if (!this.inputVariables) return '';
        const param = this.inputVariables.find(v => v.name === 'maxSelections');
        return param ? param.value : '';
    }

    @wire(getFieldsByObject, { objectApiName: '$objectApiName' })
    wiredFields({ error, data }) {
        this.isFieldsLoading = true;
        const comboboxCmp = this.template.querySelector('lightning-combobox');

        if (data) {
            this.masterFieldOptions = data;
            this.isObjectInvalid = false;
            this.isFieldsLoading = false;
            if (comboboxCmp) {
                comboboxCmp.setCustomValidity('');
                comboboxCmp.reportValidity();
            }
        } else if (error) {
            this.masterFieldOptions = [];
            this.isFieldsLoading = false;
            if (this.objectApiName) {
                this.isObjectInvalid = true;
                if (comboboxCmp) {
                    comboboxCmp.setCustomValidity('The entered Object API Name does not exist in this Org.');
                    comboboxCmp.reportValidity();
                }
            }
        }
    }

    handleObjectChange(event) {
        const value = event.detail.value;
        this.dispatchFlowValueChange('objectApiName', value, 'String');
        this.dispatchFlowValueChange('availableFields', JSON.stringify([]), 'String');
    }

    handleAvailableFieldsChange(event) {
        const values = event.detail.value ? [...event.detail.value] : [];
        this.dispatchFlowValueChange('availableFields', JSON.stringify(values), 'String');
    }

    // FIXED: Emits the value explicitly as a 'String' to prevent layout canvas errors
    handleMinChange(event) {
        const rawValue = event.detail.value;
        this.dispatchFlowValueChange('minSelections', rawValue, 'String');
    }

    // FIXED: Emits the value explicitly as a 'String' to prevent layout canvas errors
    handleMaxChange(event) {
        const rawValue = event.detail.value;
        this.dispatchFlowValueChange('maxSelections', rawValue, 'String');
    }

    @api
    validate() {
        const errors = [];
        if (this.isObjectInvalid) {
            errors.push({
                key: 'objectApiName',
                errorString: 'Please select a valid Salesforce Object API Name.'
            });
        }
        if (this.minSelections && this.maxSelections && Number(this.minSelections) > Number(this.maxSelections)) {
            errors.push({
                key: 'minSelections',
                errorString: 'Minimum selections cannot be greater than maximum selections.'
            });
        }
        return errors;
    }

    dispatchFlowValueChange(name, value, type) {
        const valueChangedEvent = new CustomEvent('configuration_editor_input_value_changed', {
            bubbles: true,
            composed: true,
            detail: {
                name: name,
                newValue: value,
                newValueDataType: type
            }
        });
        this.dispatchEvent(valueChangedEvent);
    }
}
