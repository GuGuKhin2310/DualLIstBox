import { LightningElement, api, wire, track } from 'lwc';
import getFieldsByObject from '@salesforce/apex/ListBoxController.getFieldsByObject';

export default class ListBox extends LightningElement {
    @api objectApiName;
    @api availableFields;
    @api selectedFields = [];
    

    @api minSelections;
    @api maxSelections;

    @track allFields = [];

    @wire(getFieldsByObject, { objectApiName: '$objectApiName' })
    wiredFields({ error, data }) {
        if (data) {
            this.allFields = data;
        } else if (error) {
            console.error('Error fetching fields in runtime:', error);
        }
    }

    get parsedAvailableFields() {
        if (!this.availableFields) return [];
        if (typeof this.availableFields === 'string') {
            try {
                return JSON.parse(this.availableFields);
            } catch (e) {
                return this.availableFields.split(',').map(s => s.trim());
            }
        }
        return Array.isArray(this.availableFields) ? this.availableFields : [];
    }

    get filteredOptions() {
        const pool = this.parsedAvailableFields;
        if (pool.length === 0) {
            return this.allFields;
        }
        return pool
            .map(fieldApiName => this.allFields.find(field => field.value === fieldApiName))
            .filter(field => field !== undefined);
    }

    get hasOptions() {
        return this.filteredOptions && this.filteredOptions.length > 0;
    }

    handleFieldChange(event) {
        this.selectedFields = event.detail.value;
        const attributeChangeEvent = new CustomEvent('lightning__flowattributechange', {
            detail: {
                name: 'selectedFields',
                value: this.selectedFields
            }
        });
        this.dispatchEvent(attributeChangeEvent);
    }

    @api
    validate() {
        const selectedCount = this.selectedFields ? this.selectedFields.length : 0;
        
        const minVal = this.minSelections ? parseInt(this.minSelections, 10) : null;
        const maxVal = this.maxSelections ? parseInt(this.maxSelections, 10) : null;

        if (minVal === null || isNaN(minVal)) {
            if (selectedCount < 1) {
                return {
                    isValid: false,
                    errorMessage: 'You must select at least 1 field to proceed.'
                };
            }
        } else {
            
            if (selectedCount < minVal) {
                return {
                    isValid: false,
                    errorMessage: `You must select at least ${minVal} field(s). Currently selected: ${selectedCount}.`
                };
            }
        }

        if (maxVal !== null && !isNaN(maxVal) && selectedCount > maxVal) {
            return {
                isValid: false,
                errorMessage: `You cannot select more than ${maxVal} field(s). Currently selected: ${selectedCount}.`
            };
        }

        return { isValid: true };
    }
}
