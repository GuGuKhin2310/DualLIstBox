import { LightningElement, api, track } from 'lwc';

export default class DynamicDataTable extends LightningElement {
    @api selectedFields = [];  // Array of field names string values passed directly from Screen 1
    @api tableData = [];        // Database record rows passed directly from standard Get Records
    @api outputSelectedRows = []; 

    @track searchKey = '';
    @track sortedBy;
    @track sortedDirection = 'asc';
    @track currentPage = 1;
    @track selectedRows = []; 

    pageSize = 10; // HARD LIMIT: Exactly 10 records per page

    // Reads your Listbox output string selections to dynamically create table columns!
    get computedColumns() {
        if (!this.selectedFields || this.selectedFields.length === 0) return [];
        return this.selectedFields.map(field => {
            // Cleans up the developer names into friendly table header labels
            const friendlyLabel = field.replace('__c', '').replace('_', ' ');
            return {
                label: friendlyLabel.charAt(0).toUpperCase() + friendlyLabel.slice(1),
                fieldName: field,
                type: 'text',
                sortable: true
            };
        });
    }

    get filteredData() {
        if (!this.tableData) return [];
        if (!this.searchKey) return this.tableData;

        const lowSearch = this.searchKey.toLowerCase();
        return this.tableData.filter(record => {
            return this.selectedFields.some(field => {
                const value = record[field];
                return value && String(value).toLowerCase().includes(lowSearch);
            });
        });
    }

    get paginatedData() {
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        return this.filteredData.slice(start, end);
    }

    get totalPages() {
        return Math.ceil(this.filteredData.length / this.pageSize) || 1;
    }

    get hasRecords() {
        return this.filteredData.length > 0;
    }

    get isFirstPage() {
        return this.currentPage === 1;
    }

    get isLastPage() {
        return this.currentPage >= this.totalPages;
    }

    get isExportDisabled() {
        return !this.selectedRows || this.selectedRows.length === 0;
    }

    handleSearchChange(event) {
        this.searchKey = event.detail.value;
        this.currentPage = 1; 
    }

    handlePreviousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
        }
    }

    handleNextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
        }
    }

    handleRowSelection(event) {
        this.selectedRows = event.detail.selectedRows;
        this.outputSelectedRows = [...this.selectedRows];

        const attributeChangeEvent = new CustomEvent('lightning__flowattributechange', {
            detail: {
                name: 'outputSelectedRows',
                value: this.outputSelectedRows
            }
        });
        this.dispatchEvent(attributeChangeEvent);
    }

    handleSort(event) {
        this.sortedBy = event.detail.fieldName;
        this.sortedDirection = event.detail.sortedDirection;
        
        let parseData = [...this.tableData];
        let keyValue = (a) => a[this.sortedBy];
        let isReverse = this.sortedDirection === 'asc' ? 1 : -1;

        parseData.sort((x, y) => {
            let xVal = keyValue(x) ? keyValue(x).toString().toLowerCase() : '';
            let yVal = keyValue(y) ? keyValue(y).toString().toLowerCase() : '';
            return xVal > yVal ? (1 * isReverse) : xVal < yVal ? (-1 * isReverse) : 0;
        });

        this.tableData = parseData;
    }

    downloadCSV() {
        if (this.selectedRows.length === 0) return;

        const headers = [...this.selectedFields];
        const csvRows = [];

        csvRows.push(headers.join(','));

        for (const row of this.selectedRows) {
            const values = headers.map(fieldName => {
                const val = row[fieldName] ? String(row[fieldName]).replace(/"/g, '""') : '';
                return `"${val}"`;
            });
            csvRows.push(values.join(','));
        }

        const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
        const encodedUri = encodeURI(csvContent);

        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Exported_Data_${new Date().toLocaleDateString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
