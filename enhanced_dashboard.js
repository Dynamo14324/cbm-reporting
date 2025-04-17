// Create a backup of the original file
const originalCode = document.querySelector('html').outerHTML;

// Enhanced CBM Dashboard Implementation
// Based on solution strategy to fix data connection issues and improve functionality

// Create a backup of the original file before making changes
const backupFileName = `index_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.html`;
const backupBlob = new Blob([originalCode], {type: 'text/html'});
const backupLink = document.createElement('a');
backupLink.href = URL.createObjectURL(backupBlob);
backupLink.download = backupFileName;
backupLink.click();
console.log(`Backup created: ${backupFileName}`);

// Implementation of enhanced data handling and visualization
class EnhancedCBMDashboard {
    constructor() {
        // Initialize state
        this.state = {
            files: [],
            rawData: [],
            vessels: new Set(),
            equipmentCodes: new Set(),
            components: new Set(),
            parameters: new Set(),
            charts: {},
            currentPage: 1,
            itemsPerPage: 20,
            equipmentHierarchy: {}, // New: Store equipment hierarchy
            parameterMetadata: {}, // New: Store parameter metadata
            dataQuality: {}, // New: Track data quality metrics
            processingHistory: [] // New: Track processing history
        };
        
        // Initialize UI elements
        this.initializeUI();
        
        // Initialize event listeners
        this.initializeEventListeners();
        
        // Initialize parameter metadata
        this.initializeParameterMetadata();
    }
    
    // Initialize UI elements
    initializeUI() {
        // Dropzone and file input
        this.dropzone = document.getElementById('dropzone');
        this.fileInput = document.getElementById('file-input');
        this.fileList = document.getElementById('file-list');
        this.processBtn = document.getElementById('process-btn');
        
        // Tabs
        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
        
        // Toast notification
        this.toast = document.getElementById('toast');
        this.toastMessage = document.getElementById('toast-message');
    }
    
    // Initialize parameter metadata with units and normal ranges
    initializeParameterMetadata() {
        this.state.parameterMetadata = {
            'Vel, Rms (RMS)': {
                unit: 'mm/s',
                normalRange: [0, 4.5],
                warningRange: [4.5, 7.1],
                criticalThreshold: 7.1,
                description: 'Vibration velocity (RMS)',
                category: 'vibration'
            },
            'Disp, Rms (RMS)': {
                unit: 'μm',
                normalRange: [0, 50],
                warningRange: [50, 100],
                criticalThreshold: 100,
                description: 'Vibration displacement (RMS)',
                category: 'vibration'
            },
            'Acc, Rms (RMS)': {
                unit: 'g',
                normalRange: [0, 1],
                warningRange: [1, 2],
                criticalThreshold: 2,
                description: 'Vibration acceleration (RMS)',
                category: 'vibration'
            },
            'RPM1': {
                unit: 'rpm',
                description: 'Rotational speed',
                category: 'operational'
            },
            'ALT_1': {
                unit: 'A',
                description: 'Current',
                category: 'operational'
            }
        };
        
        // Add bearing-specific parameters
        const bearingParameters = [
            'Bearing', 'Bearing, BPFO', 'Bearing, BPFI', 'Bearing, BSF', 'Bearing, FTF',
            'Cuscinetto DE', 'Cuscinetto NDE', 'Bearing DE - ISO 6305', 'Bearing NDE - ISO 6306'
        ];
        
        bearingParameters.forEach(param => {
            if (param.includes('BPFO')) {
                this.state.parameterMetadata[param] = {
                    unit: 'g',
                    description: 'Ball Pass Frequency Outer Race',
                    category: 'bearing'
                };
            } else if (param.includes('BPFI')) {
                this.state.parameterMetadata[param] = {
                    unit: 'g',
                    description: 'Ball Pass Frequency Inner Race',
                    category: 'bearing'
                };
            } else if (param.includes('BSF')) {
                this.state.parameterMetadata[param] = {
                    unit: 'g',
                    description: 'Ball Spin Frequency',
                    category: 'bearing'
                };
            } else if (param.includes('FTF')) {
                this.state.parameterMetadata[param] = {
                    unit: 'g',
                    description: 'Fundamental Train Frequency',
                    category: 'bearing'
                };
            } else {
                this.state.parameterMetadata[param] = {
                    unit: 'g',
                    description: 'Bearing vibration',
                    category: 'bearing'
                };
            }
        });
    }
    
    // Initialize event listeners
    initializeEventListeners() {
        // Tab switching
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                this.switchTab(tabId);
            });
        });
        
        // Dropzone events
        this.dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropzone.classList.add('active');
        });
        
        this.dropzone.addEventListener('dragleave', () => {
            this.dropzone.classList.remove('active');
        });
        
        this.dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropzone.classList.remove('active');
            if (e.dataTransfer.files.length) {
                this.fileInput.files = e.dataTransfer.files;
                this.updateFileList();
            }
        });

        this.dropzone.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', () => this.updateFileList());

        // Process button
        this.processBtn.addEventListener('click', () => this.processFiles());
        
        // Pagination
        document.getElementById('raw-prev-page').addEventListener('click', () => this.prevPage());
        document.getElementById('raw-next-page').addEventListener('click', () => this.nextPage());
        
        // Search and filters
        document.getElementById('raw-search').addEventListener('input', () => this.updateRawDataTable());
        document.getElementById('raw-vessel').addEventListener('change', () => this.updateRawDataTable());
        document.getElementById('raw-parameter').addEventListener('change', () => this.updateRawDataTable());
        document.getElementById('raw-range').addEventListener('change', () => this.updateRawDataTable());
        
        // Trend analysis filters
        document.getElementById('trend-vessel').addEventListener('change', () => this.updateTrendChart());
        document.getElementById('trend-parameter').addEventListener('change', () => this.updateTrendChart());
        document.getElementById('trend-range').addEventListener('change', () => this.updateTrendChart());
        
        // Equipment analysis filters
        document.getElementById('equipment-vessel').addEventListener('change', () => this.updateEquipmentFilters());
        document.getElementById('equipment-code').addEventListener('change', () => this.updateEquipmentFilters());
        document.getElementById('equipment-component').addEventListener('change', () => this.updateEquipmentAnalysis());
        document.getElementById('equipment-parameter').addEventListener('change', () => this.updateEquipmentAnalysis());
        
        // Missing equipment filters
        document.getElementById('missing-vessel').addEventListener('change', () => this.refreshMissingEquipmentData());
        document.getElementById('missing-threshold').addEventListener('change', () => this.refreshMissingEquipmentData());
        document.getElementById('missing-sort').addEventListener('change', () => this.refreshMissingEquipmentData());
        
        // Export buttons
        document.getElementById('export-equipment-btn').addEventListener('click', () => this.exportEquipmentData());
        document.getElementById('export-trend-btn').addEventListener('click', () => this.exportTrendData());
        document.getElementById('export-raw-btn').addEventListener('click', () => this.exportRawData());
        document.getElementById('export-missing-btn').addEventListener('click', () => this.exportMissingEquipmentReport());
    }

    // Switch between tabs
    switchTab(tabId) {
        // Remove active class from all tabs and content
        this.tabBtns.forEach(btn => {
            btn.classList.remove('border-b-2', 'border-blue-800', 'text-blue-800');
            btn.classList.add('text-gray-500');
        });
        
        this.tabContents.forEach(content => {
            content.classList.remove('active');
        });
        
        // Add active class to clicked tab
        const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        if (activeBtn) {
            activeBtn.classList.remove('text-gray-500');
            activeBtn.classList.add('border-b-2', 'border-blue-800', 'text-blue-800');
        }
        
        // Show corresponding content
        document.getElementById(tabId).classList.add('active');
        
        // Initialize tab-specific content if needed
        if (tabId === 'equipment' && this.state.rawData.length > 0) {
            this.updateEquipmentFilters();
        } else if (tabId === 'trend' && this.state.rawData.length > 0) {
            this.updateTrendChart();
        } else if (tabId === 'raw' && this.state.rawData.length > 0) {
            this.updateRawDataTable();
        } else if (tabId === 'missing' && this.state.rawData.length > 0) {
            this.refreshMissingEquipmentData();
        }
    }

    // Update file list after selection
    updateFileList() {
        this.fileList.innerHTML = '';
        this.state.files = Array.from(this.fileInput.files);

        if (this.state.files.length === 0) {
            this.fileList.innerHTML = '<div class="text-gray-500 p-4 text-center">No files uploaded yet</div>';
            this.processBtn.disabled = true;
            return;
        }

        this.state.files.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'flex items-center justify-between p-4';
            fileItem.innerHTML = `
                <div class="flex items-center">
                    <svg class="w-6 h-6 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <div>
                        <div class="font-medium">${file.name}</div>
                        <div class="text-sm text-gray-500">${this.formatFileSize(file.size)}</div>
                    </div>
                </div>
                <div class="text-sm text-blue-500">Ready</div>
            `;
            this.fileList.appendChild(fileItem);
        });

        this.processBtn.disabled = false;
    }

    // Format file size for display
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' bytes';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    // Process uploaded files
    async processFiles() {
        if (this.state.files.length === 0) {
            this.showToast('No files to process', 'error');
            return;
        }

        this.processBtn.disabled = true;
        this.processBtn.innerHTML = `
            <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
        `;

        // Show processing indicator
        document.getElementById('processing-results').classList.remove('hidden');
        document.getElementById('processed-files').textContent = '0';
        document.getElementById('processed-records').textContent = '0';
        
        const startTime = performance.now();
        let totalRecords = 0;
        let processedFiles = 0;
        
        // Initialize combined data array
        this.state.rawData = [];
        this.state.vessels = new Set();
        this.state.equipmentCodes = new Set();
        this.state.components = new Set();
        this.state.parameters = new Set();
        
        // Process each file
        const processNextFile = (index) => {
            if (index >= this.state.files.length) {
                // All files processed
                const endTime = performance.now();
                const processingTime = ((endTime - startTime) / 1000).toFixed(2);
                
                // Update UI
                document.getElementById('processing-time').textContent = `${processingTime}s`;
                
                // Initialize analysis tabs
                this.initializeAnalysisTabs();
                this.showToast(`Processed ${this.state.rawData.length} records from ${this.state.files.length} files successfully`);
                
                // Save to localStorage for persistence
                this.saveToLocalStorage();
                
                // Switch to Equipment Analysis tab
                this.switchTab('equipment');
                
                this.processBtn.disabled = false;
                this.processBtn.innerHTML = `
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    Process Files
                `;
                return;
            }
            
            const file = this.state.files[index];
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    // Extract vessel name from filename (improved)
                    const vesselName = this.extractVesselName(file.name);
                    this.state.vessels.add(vesselName);
                    
                    // Parse file based on type
                    let data;
                    if (file.name.endsWith('.csv')) {
                        data = this.parseCSV(e.target.result);
                    } else {
                        const arrayBuffer = e.target.result;
                        const data = new Uint8Array(arrayBuffer);
                        const workbook = XLSX.read(data, { type: 'array' });
                        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                        data = XLSX.utils.sheet_to_json(worksheet);
                    }
                    
                    // Process data with improved parser
                    const parsedData = this.parseData(data, vesselName);
                    
                    // Add to combined data
                    this.state.rawData = this.state.rawData.concat(parsedData);
                    
                    // Update counters
                    totalRecords += parsedData.length;
                    processedFiles++;
                    
                    // Update UI
                    document.getElementById('processed-files').textContent = processedFiles;
                    document.getElementById('processed-records').textContent = totalRecords;
                    
                    // Update file list item
                    const fileItems = this.fileList.querySelectorAll('div.flex');
                    if (fileItems[index]) {
                        const statusElement = fileItems[index].querySelector('.text-sm.text-blue-500');
                        if (statusElement) {
                            statusElement.textContent = 'Processed';
                            statusElement.className = 'text-sm text-green-500';
                        }
                    }
                    
                    // Process next file
                    processNextFile(index + 1);
                } catch (error) {
                    console.error('Error processing file:', error);
                    this.showToast(`Error processing file ${file.name}: ${error.message}`, 'error');
                    
                    // Update file list item to show error
                    const fileItems = this.fileList.querySelectorAll('div.flex');
                    if (fileItems[index]) {
                        const statusElement = fileItems[index].querySelector('.text-sm.text-blue-500');
                        if (statusElement) {
                            statusElement.textContent = 'Error';
                            statusElement.className = 'text-sm text-red-500';
                        }
                    }
                    
                    // Continue with next file
                    processNextFile(index + 1);
                }
            };
            
            reader.onerror = () => {
                console.error('Error reading file:', file.name);
                this.showToast(`Error reading file ${file.name}`, 'error');
                
                // Update file list item to show error
                const fileItems = this.fileList.querySelectorAll('div.flex');
                if (fileItems[index]) {
                    const statusElement = fileItems[index].querySelector('.text-sm.text-blue-500');
                    if (statusElement) {
                        statusElement.textContent = 'Error';
                        statusElement.className = 'text-sm text-red-500';
                    }
                }
                
                // Continue with next file
                processNextFile(index + 1);
            };
            
            // Read file as array buffer for Excel files, text for CSV
            if (file.name.endsWith('.csv')) {
                reader.readAsText(file);
            } else {
                reader.readAsArrayBuffer(file);
            }
        };
        
        // Start processing files
        processNextFile(0);
    }

    // Extract vessel name from filename (improved)
    extractVesselName(filename) {
        // Remove file extension
        let vesselName = filename.replace(/\.[^/.]+$/, "");
        
        // Remove "CBM" and clean up the name
        vesselName = vesselName.replace(/\s*CBM\s*$/i, "").trim();
        
        return vesselName;
    }

    // Parse CSV data
    parseCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const result = [];
        
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const values = lines[i].split(',');
            const row = {};
            
            for (let j = 0; j < headers.length; j++) {
                row[headers[j]] = values[j];
            }
            
            result.push(row);
        }
        
        return result;
    }

    // Parse data from file (enhanced)
    parseData(data, vesselName) {
        const parsedData = [];
        let dataQualityIssues = 0;
        
        data.forEach(row => {
            try {
                // Create proper timestamp from DATE and TIME columns
                let timestamp;
                let hasDateIssue = false;
                
                if (row.DATE !== undefined && row.TIME !== undefined) {
                    timestamp = this.formatTimestamp(row.DATE, row.TIME);
                    if (!timestamp) {
                        hasDateIssue = true;
                        timestamp = new Date().toISOString();
                    }
                } else if (row.TIMESTAMP !== undefined) {
                    timestamp = this.formatTimestamp(row.TIMESTAMP);
                    if (!timestamp) {
                        hasDateIssue = true;
                        timestamp = new Date().toISOString();
                    }
                } else {
                    hasDateIssue = true;
                    timestamp = new Date().toISOString();
                }
                
                // Extract equipment code and component name
                const equipmentCode = row.MP_NUMBER || '';
                const componentNumber = row.COMP_NUMBER || '';
                const component = row.COMP_NAME || '';
                const measurementPoint = row.MP_NAME || '';
                
                // Add to sets for filtering
                if (equipmentCode) this.state.equipmentCodes.add(equipmentCode);
                if (component) this.state.components.add(component);
                
                // Update equipment hierarchy
                if (equipmentCode && component) {
                    if (!this.state.equipmentHierarchy[vesselName]) {
                        this.state.equipmentHierarchy[vesselName] = {};
                    }
                    if (!this.state.equipmentHierarchy[vesselName][equipmentCode]) {
                        this.state.equipmentHierarchy[vesselName][equipmentCode] = {};
                    }
                    this.state.equipmentHierarchy[vesselName][equipmentCode][component] = true;
                }
                
                // Create a clean data object with all relevant fields
                const cleanRow = {
                    VESSEL: vesselName,
                    EQUIPMENT_CODE: equipmentCode,
                    MP_NUMBER: equipmentCode,
                    COMP_NUMBER: componentNumber,
                    COMP_NAME: component,
                    MP_NAME: measurementPoint,
                    TIMESTAMP: timestamp,
                    DATE: row.DATE,
                    TIME: row.TIME,
                    hasDateIssue: hasDateIssue
                };
                
                // Extract all numeric parameters
                let paramCount = 0;
                for (const key in row) {
                    // Skip non-parameter fields
                    if (['DATE', 'TIME', 'TIMESTAMP', 'MP_NUMBER', 'MP_NAME', 'COMP_NUMBER', 'COMP_NAME'].includes(key)) {
                        continue;
                    }
                    
                    // Try to parse as number
                    const value = parseFloat(row[key]);
                    if (!isNaN(value)) {
                        cleanRow[key] = value;
                        this.state.parameters.add(key);
                        paramCount++;
                    } else if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
                        // Store non-numeric values as strings
                        cleanRow[key] = row[key];
                    }
                }
                
                // Ensure critical parameters are present (with defaults if missing)
                const criticalParams = ['Vel, Rms (RMS)', 'Disp, Rms (RMS)', 'Acc, Rms (RMS)', 'RPM1', 'ALT_1'];
                criticalParams.forEach(param => {
                    if (cleanRow[param] === undefined) {
                        cleanRow[param] = 0;
                        dataQualityIssues++;
                    }
                });
                
                // Add data quality score
                cleanRow.dataQuality = paramCount > 0 ? 1 - (dataQualityIssues / paramCount) : 0;
                
                parsedData.push(cleanRow);
            } catch (error) {
                console.error('Error parsing row:', error, row);
                dataQualityIssues++;
            }
        });
        
        // Store data quality metrics
        this.state.dataQuality[vesselName] = {
            totalRows: data.length,
            parsedRows: parsedData.length,
            qualityIssues: dataQualityIssues,
            qualityScore: data.length > 0 ? 1 - (dataQualityIssues / data.length) : 0
        };
        
        return parsedData;
    }

    // Format timestamp (enhanced)
    formatTimestamp(date, time) {
        try {
            // Handle Excel numeric date format
            if (typeof date === 'number') {
                // Excel dates are number of days since 1900-01-01
                const excelEpoch = new Date(1900, 0, 1);
                const dateObj = new Date(excelEpoch.getTime() + (date - 1) * 24 * 60 * 60 * 1000);
                
                // Add time component if available
                if (typeof time === 'number') {
                    // Excel time is fraction of day
                    const millisInDay = 24 * 60 * 60 * 1000;
                    dateObj.setTime(dateObj.getTime() + time * millisInDay);
                }
                
                return dateObj.toISOString();
            }
            
            // Use moment.js for better date parsing
            if (time) {
                // Try to parse date and time together
                const dateTimeStr = `${date} ${time}`;
                const momentDate = moment(dateTimeStr);
                if (momentDate.isValid()) {
                    return momentDate.toISOString();
                }
                
                // Try different formats
                const formats = [
                    'YYYY-MM-DD HH:mm:ss',
                    'DD/MM/YYYY HH:mm:ss',
                    'MM/DD/YYYY HH:mm:ss',
                    'YYYY/MM/DD HH:mm:ss'
                ];
                
                for (const format of formats) {
                    const parsedDate = moment(dateTimeStr, format);
                    if (parsedDate.isValid()) {
                        return parsedDate.toISOString();
                    }
                }
            } else {
                // Try to parse date only
                const momentDate = moment(date);
                if (momentDate.isValid()) {
                    return momentDate.toISOString();
                }
            }
            
            // If all else fails, return null to indicate parsing failure
            return null;
        } catch (e) {
            console.error('Error parsing date:', e, date, time);
            return null;
        }
    }
    
    // Format timestamp for display
    formatDisplayTimestamp(timestamp) {
        if (!timestamp) return '';
        
        try {
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) return timestamp;
            
            return moment(date).format('DD MMM YYYY HH:mm');
        } catch (e) {
            return timestamp;
        }
    }
    
    // Save data to localStorage for persistence
    saveToLocalStorage() {
        try {
            // Save only essential data to avoid storage limits
            const dataToSave = {
                vessels: Array.from(this.state.vessels),
                equipmentCodes: Array.from(this.state.equipmentCodes),
                components: Array.from(this.state.components),
                parameters: Array.from(this.state.parameters),
                equipmentHierarchy: this.state.equipmentHierarchy,
                dataQuality: this.state.dataQuality,
                lastUpdated: new Date().toISOString()
            };
            
            localStorage.setItem('cbmDashboardMetadata', JSON.stringify(dataToSave));
            
            // Add to processing history
            this.state.processingHistory.push({
                timestamp: new Date().toISOString(),
                fileCount: this.state.files.length,
                recordCount: this.state.rawData.length
            });
            
            localStorage.setItem('cbmProcessingHistory', JSON.stringify(this.state.processingHistory));
            
            console.log('Data saved to localStorage');
        } catch (e) {
            console.error('Error saving to localStorage:', e);
        }
    }
    
    // Load data from localStorage
    loadFromLocalStorage() {
        try {
            const savedMetadata = localStorage.getItem('cbmDashboardMetadata');
            if (savedMetadata) {
                const data = JSON.parse(savedMetadata);
                
                // Restore sets
                this.state.vessels = new Set(data.vessels || []);
                this.state.equipmentCodes = new Set(data.equipmentCodes || []);
                this.state.components = new Set(data.components || []);
                this.state.parameters = new Set(data.parameters || []);
                
                // Restore objects
                this.state.equipmentHierarchy = data.equipmentHierarchy || {};
                this.state.dataQuality = data.dataQuality || {};
                
                console.log('Data loaded from localStorage');
                return true;
            }
            return false;
        } catch (e) {
            console.error('Error loading from localStorage:', e);
            return false;
        }
    }
    
    // Initialize analysis tabs after data processing
    initializeAnalysisTabs() {
        // Populate vessel dropdowns
        const vesselSelects = [
            document.getElementById('equipment-vessel'),
            document.getElementById('trend-vessel'),
            document.getElementById('raw-vessel'),
            document.getElementById('missing-vessel')
        ];
        
        vesselSelects.forEach(select => {
            if (!select) return;
            
            // Clear existing options
            select.innerHTML = '';
            
            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = select.id === 'trend-vessel' ? 'All Vessels' : 'Select Vessel';
            select.appendChild(defaultOption);
            
            // Add vessel options
            Array.from(this.state.vessels).sort().forEach(vessel => {
                const option = document.createElement('option');
                option.value = vessel;
                option.textContent = vessel;
                select.appendChild(option);
            });
        });
        
        // Populate parameter dropdowns
        const parameterSelects = [
            document.getElementById('equipment-parameter'),
            document.getElementById('trend-parameter'),
            document.getElementById('raw-parameter')
        ];
        
        parameterSelects.forEach(select => {
            if (!select) return;
            
            // Clear existing options
            select.innerHTML = '';
            
            // Add default vibration parameters
            const defaultParams = [
                'Vel, Rms (RMS)',
                'Disp, Rms (RMS)',
                'Acc, Rms (RMS)',
                'RPM1',
                'ALT_1'
            ];
            
            defaultParams.forEach(param => {
                const option = document.createElement('option');
                option.value = param;
                
                // Add units and description if available
                let displayText = param;
                if (this.state.parameterMetadata[param]) {
                    const metadata = this.state.parameterMetadata[param];
                    if (metadata.unit) {
                        displayText += ` (${metadata.unit})`;
                    }
                }
                
                option.textContent = displayText;
                select.appendChild(option);
            });
            
            // Add additional parameters found in data
            const additionalParams = Array.from(this.state.parameters)
                .filter(param => !defaultParams.includes(param))
                .sort();
                
            if (additionalParams.length > 0) {
                // Add separator
                const separator = document.createElement('option');
                separator.disabled = true;
                separator.textContent = '──────────';
                select.appendChild(separator);
                
                // Add additional parameters
                additionalParams.forEach(param => {
                    const option = document.createElement('option');
                    option.value = param;
                    option.textContent = param;
                    select.appendChild(option);
                });
            }
        });
        
        // Initialize equipment filters
        this.updateEquipmentFilters();
        
        // Initialize trend chart
        this.updateTrendChart();
        
        // Initialize raw data table
        this.updateRawDataTable();
        
        // Initialize missing equipment data
        this.refreshMissingEquipmentData();
    }
    
    // Update equipment filters based on selection
    updateEquipmentFilters() {
        const vesselSelect = document.getElementById('equipment-vessel');
        const equipmentSelect = document.getElementById('equipment-code');
        const componentSelect = document.getElementById('equipment-component');
        
        const selectedVessel = vesselSelect.value;
        const selectedEquipment = equipmentSelect.value;
        
        // Update equipment codes based on vessel selection
        if (selectedVessel && this.state.equipmentHierarchy[selectedVessel]) {
            // Clear existing options
            equipmentSelect.innerHTML = '';
            
            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Select Code';
            equipmentSelect.appendChild(defaultOption);
            
            // Add equipment options
            Object.keys(this.state.equipmentHierarchy[selectedVessel])
                .sort()
                .forEach(code => {
                    const option = document.createElement('option');
                    option.value = code;
                    option.textContent = code;
                    equipmentSelect.appendChild(option);
                });
        } else if (!selectedVessel) {
            // If no vessel selected, show all equipment codes
            equipmentSelect.innerHTML = '';
            
            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Select Code';
            equipmentSelect.appendChild(defaultOption);
            
            // Add all equipment codes
            Array.from(this.state.equipmentCodes)
                .sort()
                .forEach(code => {
                    const option = document.createElement('option');
                    option.value = code;
                    option.textContent = code;
                    equipmentSelect.appendChild(option);
                });
        }
        
        // Update components based on vessel and equipment selection
        if (selectedVessel && selectedEquipment && 
            this.state.equipmentHierarchy[selectedVessel] && 
            this.state.equipmentHierarchy[selectedVessel][selectedEquipment]) {
            
            // Clear existing options
            componentSelect.innerHTML = '';
            
            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Select Component';
            componentSelect.appendChild(defaultOption);
            
            // Add component options
            Object.keys(this.state.equipmentHierarchy[selectedVessel][selectedEquipment])
                .sort()
                .forEach(comp => {
                    const option = document.createElement('option');
                    option.value = comp;
                    option.textContent = comp;
                    componentSelect.appendChild(option);
                });
        } else {
            // If no vessel or equipment selected, show all components
            componentSelect.innerHTML = '';
            
            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Select Component';
            componentSelect.appendChild(defaultOption);
            
            // Add all components
            Array.from(this.state.components)
                .sort()
                .forEach(comp => {
                    const option = document.createElement('option');
                    option.value = comp;
                    option.textContent = comp;
                    componentSelect.appendChild(option);
                });
        }
        
        // Update analysis based on current selections
        this.updateEquipmentAnalysis();
    }
    
    // Update equipment analysis
    updateEquipmentAnalysis() {
        const vessel = document.getElementById('equipment-vessel').value;
        const equipment = document.getElementById('equipment-code').value;
        const component = document.getElementById('equipment-component').value;
        const parameter = document.getElementById('equipment-parameter').value;
        
        // Filter data based on selections
        let filteredData = this.state.rawData.filter(row => {
            return (!vessel || row.VESSEL === vessel) &&
                   (!equipment || row.EQUIPMENT_CODE === equipment) &&
                   (!component || row.COMP_NAME === component);
        });
        
        // Sort by timestamp
        filteredData.sort((a, b) => new Date(a.TIMESTAMP) - new Date(b.TIMESTAMP));
        
        // Update charts
        this.updateEquipmentChart(filteredData, parameter);
        
        // Update readings table
        this.updateEquipmentReadingsTable(filteredData, parameter);
    }
    
    // Update equipment chart
    updateEquipmentChart(data, parameter) {
        const ctx = document.getElementById('equipment-trend-chart').getContext('2d');
        
        // Prepare chart data
        const labels = data.map(row => this.formatDisplayTimestamp(row.TIMESTAMP));
        const values = data.map(row => row[parameter]);
        
        // Get parameter metadata
        const metadata = this.state.parameterMetadata[parameter] || {};
        const parameterLabel = metadata.unit ? `${parameter} (${metadata.unit})` : parameter;
        
        // Create threshold lines if available
        let thresholdDatasets = [];
        if (metadata.warningRange && metadata.criticalThreshold) {
            thresholdDatasets = [
                {
                    label: 'Warning Threshold',
                    data: Array(labels.length).fill(metadata.warningRange[0]),
                    borderColor: '#f59e0b',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0
                },
                {
                    label: 'Critical Threshold',
                    data: Array(labels.length).fill(metadata.criticalThreshold),
                    borderColor: '#ef4444',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0
                }
            ];
        }
        
        // Create or update chart
        if (this.state.charts.equipmentTrendChart) {
            this.state.charts.equipmentTrendChart.data.labels = labels;
            this.state.charts.equipmentTrendChart.data.datasets[0].data = values;
            this.state.charts.equipmentTrendChart.data.datasets[0].label = parameterLabel;
            
            // Update threshold lines if available
            if (thresholdDatasets.length > 0) {
                if (this.state.charts.equipmentTrendChart.data.datasets.length > 1) {
                    this.state.charts.equipmentTrendChart.data.datasets[1] = thresholdDatasets[0];
                    if (this.state.charts.equipmentTrendChart.data.datasets.length > 2) {
                        this.state.charts.equipmentTrendChart.data.datasets[2] = thresholdDatasets[1];
                    } else {
                        this.state.charts.equipmentTrendChart.data.datasets.push(thresholdDatasets[1]);
                    }
                } else {
                    this.state.charts.equipmentTrendChart.data.datasets.push(...thresholdDatasets);
                }
            } else {
                // Remove threshold lines if not needed
                this.state.charts.equipmentTrendChart.data.datasets = [this.state.charts.equipmentTrendChart.data.datasets[0]];
            }
            
            this.state.charts.equipmentTrendChart.update();
        } else {
            // Combine main dataset with thresholds
            const datasets = [
                {
                    label: parameterLabel,
                    data: values,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true
                },
                ...thresholdDatasets
            ];
            
            this.state.charts.equipmentTrendChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Timestamp'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: parameterLabel
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        },
                        legend: {
                            position: 'top'
                        }
                    }
                }
            });
        }
        
        // Update RPM vs Ampere chart if data is available
        if (parameter === 'RPM1' || parameter === 'ALT_1') {
            this.updateRpmAmpereChart(data);
        }
    }
    
    // Update RPM vs Ampere chart
    updateRpmAmpereChart(data) {
        const ctx = document.getElementById('rpm-ampere-chart').getContext('2d');
        
        // Prepare data points
        const rpmData = data.map(row => row.RPM1);
        const ampereData = data.map(row => row.ALT_1);
        const labels = data.map(row => this.formatDisplayTimestamp(row.TIMESTAMP));
        
        // Create or update chart
        if (this.state.charts.rpmAmpereChart) {
            this.state.charts.rpmAmpereChart.data.labels = labels;
            this.state.charts.rpmAmpereChart.data.datasets[0].data = rpmData;
            this.state.charts.rpmAmpereChart.data.datasets[1].data = ampereData;
            this.state.charts.rpmAmpereChart.update();
        } else {
            this.state.charts.rpmAmpereChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'RPM',
                            data: rpmData,
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            borderWidth: 2,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Ampere',
                            data: ampereData,
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            borderWidth: 2,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Timestamp'
                            }
                        },
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'RPM'
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: {
                                display: true,
                                text: 'Ampere'
                            },
                            grid: {
                                drawOnChartArea: false
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        }
                    }
                }
            });
        }
    }
    
    // Update equipment readings table
    updateEquipmentReadingsTable(data, parameter) {
        const tableBody = document.getElementById('equipment-readings');
        tableBody.innerHTML = '';
        
        // Sort by timestamp (newest first)
        const sortedData = [...data].sort((a, b) => new Date(b.TIMESTAMP) - new Date(a.TIMESTAMP));
        
        // Show only the most recent 10 readings
        const recentData = sortedData.slice(0, 10);
        
        if (recentData.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-4 py-4 text-center text-gray-500">No data available</td>
                </tr>
            `;
            return;
        }
        
        // Get parameter metadata for status determination
        const metadata = this.state.parameterMetadata[parameter] || {};
        
        // Add rows to table
        recentData.forEach(row => {
            const value = row[parameter];
            let status, statusClass;
            
            // Determine status based on parameter value and metadata
            if (metadata.normalRange && metadata.warningRange && metadata.criticalThreshold) {
                if (value > metadata.criticalThreshold) {
                    status = 'Critical';
                    statusClass = 'status-critical';
                } else if (value > metadata.warningRange[0]) {
                    status = 'Warning';
                    statusClass = 'status-warning';
                } else {
                    status = 'Normal';
                    statusClass = 'status-good';
                }
            } else if (parameter === 'Vel, Rms (RMS)') {
                // Fallback for velocity if metadata not available
                if (value > 7.1) {
                    status = 'Critical';
                    statusClass = 'status-critical';
                } else if (value > 4.5) {
                    status = 'Warning';
                    statusClass = 'status-warning';
                } else {
                    status = 'Normal';
                    statusClass = 'status-good';
                }
            } else {
                status = 'Normal';
                statusClass = 'status-good';
            }
            
            // Format value with units if available
            let displayValue = value;
            if (metadata.unit) {
                displayValue = `${value} ${metadata.unit}`;
            }
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-4 py-2">${this.formatDisplayTimestamp(row.TIMESTAMP)}</td>
                <td class="px-4 py-2">${row.EQUIPMENT_CODE}</td>
                <td class="px-4 py-2">${row.COMP_NAME}</td>
                <td class="px-4 py-2">${parameter}</td>
                <td class="px-4 py-2">${displayValue}</td>
                <td class="px-4 py-2">
                    <span class="status-indicator ${statusClass}"></span>
                    ${status}
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }
    
    // Update trend chart
    updateTrendChart() {
        const vessel = document.getElementById('trend-vessel').value;
        const parameter = document.getElementById('trend-parameter').value;
        const range = parseInt(document.getElementById('trend-range').value);
        
        // Filter data based on selections
        let filteredData = this.state.rawData.filter(row => {
            // Filter by vessel if selected
            if (vessel && row.VESSEL !== vessel) {
                return false;
            }
            
            // Filter by date range if specified
            if (range > 0) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - range);
                return new Date(row.TIMESTAMP) >= cutoffDate;
            }
            
            return true;
        });
        
        // Sort by timestamp
        filteredData.sort((a, b) => new Date(a.TIMESTAMP) - new Date(b.TIMESTAMP));
        
        // Group data by vessel for multi-series chart
        const vesselData = {};
        filteredData.forEach(row => {
            if (!vesselData[row.VESSEL]) {
                vesselData[row.VESSEL] = {
                    timestamps: [],
                    values: []
                };
            }
            
            vesselData[row.VESSEL].timestamps.push(this.formatDisplayTimestamp(row.TIMESTAMP));
            vesselData[row.VESSEL].values.push(row[parameter]);
        });
        
        // Prepare datasets for chart
        const datasets = [];
        const colors = [
            '#3b82f6', // blue
            '#10b981', // green
            '#f59e0b', // amber
            '#8b5cf6', // purple
            '#ec4899', // pink
            '#06b6d4', // cyan
            '#f97316', // orange
            '#14b8a6'  // teal
        ];
        
        let colorIndex = 0;
        for (const vessel in vesselData) {
            datasets.push({
                label: vessel,
                data: vesselData[vessel].values,
                borderColor: colors[colorIndex % colors.length],
                backgroundColor: `${colors[colorIndex % colors.length]}33`,
                borderWidth: 2,
                fill: false
            });
            colorIndex++;
        }
        
        // Get parameter metadata
        const metadata = this.state.parameterMetadata[parameter] || {};
        const parameterLabel = metadata.unit ? `${parameter} (${metadata.unit})` : parameter;
        
        // Create chart
        const ctx = document.getElementById('trend-chart').getContext('2d');
        
        if (this.state.charts.trendChart) {
            this.state.charts.trendChart.data.datasets = datasets;
            
            // Use timestamps from first vessel or empty array if no data
            const timestamps = datasets.length > 0 ? 
                vesselData[Object.keys(vesselData)[0]].timestamps : [];
                
            this.state.charts.trendChart.data.labels = timestamps;
            this.state.charts.trendChart.options.scales.y.title.text = parameterLabel;
            this.state.charts.trendChart.update();
        } else {
            // Use timestamps from first vessel or empty array if no data
            const timestamps = datasets.length > 0 ? 
                vesselData[Object.keys(vesselData)[0]].timestamps : [];
                
            this.state.charts.trendChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: timestamps,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Timestamp'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: parameterLabel
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        },
                        legend: {
                            position: 'top'
                        }
                    }
                }
            });
        }
        
        // Calculate statistics
        this.updateTrendStatistics(filteredData, parameter);
    }
    
    // Update trend statistics
    updateTrendStatistics(data, parameter) {
        const values = data.map(row => row[parameter]).filter(val => !isNaN(val));
        
        if (values.length === 0) {
            document.getElementById('trend-average').textContent = '-';
            document.getElementById('trend-minimum').textContent = '-';
            document.getElementById('trend-maximum').textContent = '-';
            document.getElementById('trend-stddev').textContent = '-';
            return;
        }
        
        // Calculate statistics
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        
        // Calculate standard deviation
        const squareDiffs = values.map(value => {
            const diff = value - avg;
            return diff * diff;
        });
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
        const stdDev = Math.sqrt(avgSquareDiff);
        
        // Get parameter metadata for units
        const metadata = this.state.parameterMetadata[parameter] || {};
        const unit = metadata.unit || '';
        
        // Update UI
        document.getElementById('trend-average').textContent = `${avg.toFixed(2)} ${unit}`;
        document.getElementById('trend-minimum').textContent = `${min.toFixed(2)} ${unit}`;
        document.getElementById('trend-maximum').textContent = `${max.toFixed(2)} ${unit}`;
        document.getElementById('trend-stddev').textContent = `${stdDev.toFixed(2)} ${unit}`;
    }
    
    // Update raw data table
    updateRawDataTable() {
        const vessel = document.getElementById('raw-vessel').value;
        const parameter = document.getElementById('raw-parameter').value;
        const range = parseInt(document.getElementById('raw-range').value);
        const search = document.getElementById('raw-search').value.toLowerCase();
        
        // Filter data based on selections
        let filteredData = this.state.rawData.filter(row => {
            // Filter by vessel if selected
            if (vessel && row.VESSEL !== vessel) {
                return false;
            }
            
            // Filter by date range if specified
            if (range > 0) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - range);
                return new Date(row.TIMESTAMP) >= cutoffDate;
            }
            
            // Filter by search term
            if (search) {
                return (
                    (row.VESSEL && row.VESSEL.toLowerCase().includes(search)) ||
                    (row.EQUIPMENT_CODE && row.EQUIPMENT_CODE.toLowerCase().includes(search)) ||
                    (row.COMP_NAME && row.COMP_NAME.toLowerCase().includes(search))
                );
            }
            
            return true;
        });
        
        // Sort by timestamp (newest first)
        filteredData.sort((a, b) => new Date(b.TIMESTAMP) - new Date(a.TIMESTAMP));
        
        // Update pagination info
        const totalItems = filteredData.length;
        const totalPages = Math.ceil(totalItems / this.state.itemsPerPage);
        
        // Ensure current page is valid
        if (this.state.currentPage > totalPages) {
            this.state.currentPage = totalPages || 1;
        }
        
        // Get current page data
        const startIndex = (this.state.currentPage - 1) * this.state.itemsPerPage;
        const endIndex = startIndex + this.state.itemsPerPage;
        const currentPageData = filteredData.slice(startIndex, endIndex);
        
        // Update table
        const tableBody = document.getElementById('raw-data-body');
        tableBody.innerHTML = '';
        
        if (currentPageData.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-4 py-4 text-center text-gray-500">No data available</td>
                </tr>
            `;
        } else {
            // Get parameter metadata for units
            const metadata = this.state.parameterMetadata[parameter] || {};
            const unit = metadata.unit || '';
            
            currentPageData.forEach(row => {
                const tr = document.createElement('tr');
                
                // Format value with units if available
                let displayValue = row[parameter];
                if (unit) {
                    displayValue = `${displayValue} ${unit}`;
                }
                
                tr.innerHTML = `
                    <td class="px-4 py-2">${this.formatDisplayTimestamp(row.TIMESTAMP)}</td>
                    <td class="px-4 py-2">${row.VESSEL}</td>
                    <td class="px-4 py-2">${row.EQUIPMENT_CODE}</td>
                    <td class="px-4 py-2">${row.COMP_NAME}</td>
                    <td class="px-4 py-2">${parameter}</td>
                    <td class="px-4 py-2">${displayValue}</td>
                `;
                tableBody.appendChild(tr);
            });
        }
        
        // Update pagination controls
        document.getElementById('raw-current-page').textContent = this.state.currentPage;
        document.getElementById('raw-total-pages').textContent = totalPages;
        document.getElementById('raw-prev-page').disabled = this.state.currentPage <= 1;
        document.getElementById('raw-next-page').disabled = this.state.currentPage >= totalPages;
        
        // Update record count
        document.getElementById('raw-record-count').textContent = totalItems;
    }
    
    // Go to previous page
    prevPage() {
        if (this.state.currentPage > 1) {
            this.state.currentPage--;
            this.updateRawDataTable();
        }
    }
    
    // Go to next page
    nextPage() {
        const totalItems = this.state.rawData.length;
        const totalPages = Math.ceil(totalItems / this.state.itemsPerPage);
        
        if (this.state.currentPage < totalPages) {
            this.state.currentPage++;
            this.updateRawDataTable();
        }
    }
    
    // Refresh missing equipment data
    refreshMissingEquipmentData() {
        const vessel = document.getElementById('missing-vessel').value;
        const threshold = parseInt(document.getElementById('missing-threshold').value);
        const sortBy = document.getElementById('missing-sort').value;
        
        // Filter data based on vessel selection
        let filteredData = this.state.rawData;
        if (vessel) {
            filteredData = filteredData.filter(row => row.VESSEL === vessel);
        }
        
        // Group data by equipment and component
        const equipmentData = {};
        
        filteredData.forEach(row => {
            const key = `${row.VESSEL}|${row.EQUIPMENT_CODE}|${row.COMP_NAME}`;
            
            if (!equipmentData[key]) {
                equipmentData[key] = {
                    vessel: row.VESSEL,
                    equipmentCode: row.EQUIPMENT_CODE,
                    component: row.COMP_NAME,
                    readings: [],
                    lastReading: null,
                    daysSinceLastReading: 0
                };
            }
            
            equipmentData[key].readings.push({
                timestamp: row.TIMESTAMP,
                value: row['Vel, Rms (RMS)']
            });
        });
        
        // Calculate days since last reading
        const now = new Date();
        
        for (const key in equipmentData) {
            const equipment = equipmentData[key];
            
            // Sort readings by timestamp (newest first)
            equipment.readings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            if (equipment.readings.length > 0) {
                equipment.lastReading = equipment.readings[0].timestamp;
                const lastReadingDate = new Date(equipment.lastReading);
                const diffTime = Math.abs(now - lastReadingDate);
                equipment.daysSinceLastReading = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }
        }
        
        // Filter by threshold
        const missingEquipment = Object.values(equipmentData)
            .filter(equipment => equipment.daysSinceLastReading >= threshold);
        
        // Sort by selected criteria
        if (sortBy === 'days') {
            missingEquipment.sort((a, b) => b.daysSinceLastReading - a.daysSinceLastReading);
        } else if (sortBy === 'vessel') {
            missingEquipment.sort((a, b) => a.vessel.localeCompare(b.vessel));
        } else if (sortBy === 'equipment') {
            missingEquipment.sort((a, b) => a.equipmentCode.localeCompare(b.equipmentCode));
        }
        
        // Update table
        const tableBody = document.getElementById('missing-equipment-body');
        tableBody.innerHTML = '';
        
        if (missingEquipment.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-4 py-4 text-center text-gray-500">No missing readings found</td>
                </tr>
            `;
        } else {
            missingEquipment.forEach(equipment => {
                const tr = document.createElement('tr');
                
                // Determine status class based on days since last reading
                let statusClass;
                if (equipment.daysSinceLastReading >= 90) {
                    statusClass = 'status-critical';
                } else if (equipment.daysSinceLastReading >= 30) {
                    statusClass = 'status-warning';
                } else {
                    statusClass = 'status-good';
                }
                
                tr.innerHTML = `
                    <td class="px-4 py-2">${equipment.vessel}</td>
                    <td class="px-4 py-2">${equipment.equipmentCode}</td>
                    <td class="px-4 py-2">${equipment.component}</td>
                    <td class="px-4 py-2">${this.formatDisplayTimestamp(equipment.lastReading)}</td>
                    <td class="px-4 py-2">
                        <span class="status-indicator ${statusClass}"></span>
                        ${equipment.daysSinceLastReading} days
                    </td>
                `;
                tableBody.appendChild(tr);
            });
        }
        
        // Update count
        document.getElementById('missing-count').textContent = missingEquipment.length;
    }
    
    // Export equipment data
    exportEquipmentData() {
        const vessel = document.getElementById('equipment-vessel').value;
        const equipment = document.getElementById('equipment-code').value;
        const component = document.getElementById('equipment-component').value;
        const parameter = document.getElementById('equipment-parameter').value;
        
        // Filter data based on selections
        let filteredData = this.state.rawData.filter(row => {
            return (!vessel || row.VESSEL === vessel) &&
                   (!equipment || row.EQUIPMENT_CODE === equipment) &&
                   (!component || row.COMP_NAME === component);
        });
        
        // Sort by timestamp
        filteredData.sort((a, b) => new Date(a.TIMESTAMP) - new Date(b.TIMESTAMP));
        
        // Prepare CSV data
        const headers = ['Timestamp', 'Vessel', 'Equipment Code', 'Component', parameter];
        const rows = filteredData.map(row => [
            this.formatDisplayTimestamp(row.TIMESTAMP),
            row.VESSEL,
            row.EQUIPMENT_CODE,
            row.COMP_NAME,
            row[parameter]
        ]);
        
        // Generate CSV
        this.exportToCSV(headers, rows, `equipment_data_${new Date().toISOString().slice(0, 10)}.csv`);
    }
    
    // Export trend data
    exportTrendData() {
        const vessel = document.getElementById('trend-vessel').value;
        const parameter = document.getElementById('trend-parameter').value;
        const range = parseInt(document.getElementById('trend-range').value);
        
        // Filter data based on selections
        let filteredData = this.state.rawData.filter(row => {
            // Filter by vessel if selected
            if (vessel && row.VESSEL !== vessel) {
                return false;
            }
            
            // Filter by date range if specified
            if (range > 0) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - range);
                return new Date(row.TIMESTAMP) >= cutoffDate;
            }
            
            return true;
        });
        
        // Sort by timestamp
        filteredData.sort((a, b) => new Date(a.TIMESTAMP) - new Date(b.TIMESTAMP));
        
        // Prepare CSV data
        const headers = ['Timestamp', 'Vessel', 'Equipment Code', 'Component', parameter];
        const rows = filteredData.map(row => [
            this.formatDisplayTimestamp(row.TIMESTAMP),
            row.VESSEL,
            row.EQUIPMENT_CODE,
            row.COMP_NAME,
            row[parameter]
        ]);
        
        // Generate CSV
        this.exportToCSV(headers, rows, `trend_data_${new Date().toISOString().slice(0, 10)}.csv`);
    }
    
    // Export raw data
    exportRawData() {
        const vessel = document.getElementById('raw-vessel').value;
        const parameter = document.getElementById('raw-parameter').value;
        const range = parseInt(document.getElementById('raw-range').value);
        const search = document.getElementById('raw-search').value.toLowerCase();
        
        // Filter data based on selections
        let filteredData = this.state.rawData.filter(row => {
            // Filter by vessel if selected
            if (vessel && row.VESSEL !== vessel) {
                return false;
            }
            
            // Filter by date range if specified
            if (range > 0) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - range);
                return new Date(row.TIMESTAMP) >= cutoffDate;
            }
            
            // Filter by search term
            if (search) {
                return (
                    (row.VESSEL && row.VESSEL.toLowerCase().includes(search)) ||
                    (row.EQUIPMENT_CODE && row.EQUIPMENT_CODE.toLowerCase().includes(search)) ||
                    (row.COMP_NAME && row.COMP_NAME.toLowerCase().includes(search))
                );
            }
            
            return true;
        });
        
        // Sort by timestamp
        filteredData.sort((a, b) => new Date(a.TIMESTAMP) - new Date(b.TIMESTAMP));
        
        // Prepare CSV data
        const headers = ['Timestamp', 'Vessel', 'Equipment Code', 'Component', parameter];
        const rows = filteredData.map(row => [
            this.formatDisplayTimestamp(row.TIMESTAMP),
            row.VESSEL,
            row.EQUIPMENT_CODE,
            row.COMP_NAME,
            row[parameter]
        ]);
        
        // Generate CSV
        this.exportToCSV(headers, rows, `raw_data_${new Date().toISOString().slice(0, 10)}.csv`);
    }
    
    // Export missing equipment report
    exportMissingEquipmentReport() {
        const vessel = document.getElementById('missing-vessel').value;
        const threshold = parseInt(document.getElementById('missing-threshold').value);
        
        // Filter data based on vessel selection
        let filteredData = this.state.rawData;
        if (vessel) {
            filteredData = filteredData.filter(row => row.VESSEL === vessel);
        }
        
        // Group data by equipment and component
        const equipmentData = {};
        
        filteredData.forEach(row => {
            const key = `${row.VESSEL}|${row.EQUIPMENT_CODE}|${row.COMP_NAME}`;
            
            if (!equipmentData[key]) {
                equipmentData[key] = {
                    vessel: row.VESSEL,
                    equipmentCode: row.EQUIPMENT_CODE,
                    component: row.COMP_NAME,
                    readings: [],
                    lastReading: null,
                    daysSinceLastReading: 0
                };
            }
            
            equipmentData[key].readings.push({
                timestamp: row.TIMESTAMP,
                value: row['Vel, Rms (RMS)']
            });
        });
        
        // Calculate days since last reading
        const now = new Date();
        
        for (const key in equipmentData) {
            const equipment = equipmentData[key];
            
            // Sort readings by timestamp (newest first)
            equipment.readings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            if (equipment.readings.length > 0) {
                equipment.lastReading = equipment.readings[0].timestamp;
                const lastReadingDate = new Date(equipment.lastReading);
                const diffTime = Math.abs(now - lastReadingDate);
                equipment.daysSinceLastReading = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }
        }
        
        // Filter by threshold
        const missingEquipment = Object.values(equipmentData)
            .filter(equipment => equipment.daysSinceLastReading >= threshold)
            .sort((a, b) => b.daysSinceLastReading - a.daysSinceLastReading);
        
        // Prepare CSV data
        const headers = ['Vessel', 'Equipment Code', 'Component', 'Last Reading', 'Days Since Last Reading'];
        const rows = missingEquipment.map(equipment => [
            equipment.vessel,
            equipment.equipmentCode,
            equipment.component,
            this.formatDisplayTimestamp(equipment.lastReading),
            equipment.daysSinceLastReading
        ]);
        
        // Generate CSV
        this.exportToCSV(headers, rows, `missing_readings_${new Date().toISOString().slice(0, 10)}.csv`);
    }
    
    // Export data to CSV
    exportToCSV(headers, rows, filename) {
        // Create CSV content
        let csvContent = headers.join(',') + '\n';
        
        rows.forEach(row => {
            csvContent += row.join(',') + '\n';
        });
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showToast(`Exported ${rows.length} records to ${filename}`);
    }
    
    // Show toast notification
    showToast(message, type = 'success') {
        this.toastMessage.textContent = message;
        
        // Set toast color based on type
        if (type === 'error') {
            this.toast.className = 'bg-red-500 text-white px-6 py-3 rounded shadow-lg';
        } else if (type === 'warning') {
            this.toast.className = 'bg-yellow-500 text-white px-6 py-3 rounded shadow-lg';
        } else {
            this.toast.className = 'bg-green-500 text-white px-6 py-3 rounded shadow-lg';
        }
        
        // Show toast
        this.toast.classList.add('show');
        
        // Hide toast after 3 seconds
        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 3000);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new EnhancedCBMDashboard();
    console.log('Enhanced CBM Dashboard initialized');
});
