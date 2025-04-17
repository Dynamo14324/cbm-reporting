// Enhanced CBM Dashboard JavaScript - Version 2.1
// This version adds additional improvements to the filtering system
// and ensures all graphs display properly with complete data integration

// Additional improvements in v2.1:
// - Fully independent filter selection with bidirectional updates
// - Enhanced data visualization with multiple chart types
// - Improved data validation and error handling
// - Better performance with large datasets
// - More intuitive user interface interactions

// Global data store with enhanced relationships
const dashboardData = {
    vessels: [],
    equipmentCodes: {},
    components: {},
    mpNames: {},
    compCodes: {},
    readings: [],
    parameters: {
        "Vel, Rms (RMS)": { unit: "mm/s", thresholdWarning: 4.5, thresholdCritical: 7.1 },
        "Disp, Rms (RMS)": { unit: "µm", thresholdWarning: 50, thresholdCritical: 100 },
        "Acc, Rms (RMS)": { unit: "g", thresholdWarning: 1.5, thresholdCritical: 3.0 },
        "RPM1": { unit: "rpm" },
        "ALT_1": { unit: "A" }
    },
    charts: {},
    // Enhanced relationships structure for bidirectional filtering
    relationships: {
        vessel: {
            equipmentCodes: {},
            components: {},
            mpNames: {},
            compCodes: {}
        },
        equipmentCode: {
            vessels: {},
            components: {},
            mpNames: {},
            compCodes: {}
        },
        component: {
            vessels: {},
            equipmentCodes: {},
            mpNames: {},
            compCodes: {}
        },
        mpName: {
            vessels: {},
            equipmentCodes: {},
            components: {},
            compCodes: {}
        },
        compCode: {
            vessels: {},
            equipmentCodes: {},
            components: {},
            mpNames: {}
        }
    },
    // Cache for filter states to improve performance
    filterCache: {}
};

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log("Initializing Enhanced CBM Dashboard v2.1");
    initializeDropzone();
    initializeTabs();
    initializeEventListeners();
    
    // Try to load data from localStorage
    loadDataFromLocalStorage();
});

// Initialize the file dropzone
function initializeDropzone() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    
    // Handle drag and drop events
    dropzone.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropzone.classList.add('active');
    });
    
    dropzone.addEventListener('dragleave', function() {
        dropzone.classList.remove('active');
    });
    
    dropzone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropzone.classList.remove('active');
        
        if (e.dataTransfer.files.length) {
            handleFiles(e.dataTransfer.files);
        }
    });
    
    // Handle click to browse files
    dropzone.addEventListener('click', function() {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', function() {
        if (fileInput.files.length) {
            handleFiles(fileInput.files);
        }
    });
}

// Initialize tabs
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Update active tab button
            tabButtons.forEach(btn => {
                btn.classList.remove('border-blue-800', 'text-blue-800');
                btn.classList.add('text-gray-500');
            });
            this.classList.remove('text-gray-500');
            this.classList.add('border-blue-800', 'text-blue-800');
            
            // Update active tab content
            tabContents.forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tabId).classList.add('active');
            
            // Refresh charts if needed
            if (tabId === 'equipment') {
                updateEquipmentAnalysis();
            } else if (tabId === 'trend') {
                updateTrendAnalysis();
            } else if (tabId === 'raw') {
                updateRawDataView();
            } else if (tabId === 'missing') {
                updateMissingReadingsView();
            }
        });
    });
}

// Initialize event listeners for filters and buttons with improved handling
function initializeEventListeners() {
    // Equipment Analysis tab - enhanced with independent filter selection
    document.getElementById('equipment-vessel').addEventListener('change', function() {
        updateEquipmentFilters('vessel');
        updateEquipmentAnalysis();
    });
    
    document.getElementById('equipment-code').addEventListener('change', function() {
        updateEquipmentFilters('equipmentCode');
        updateEquipmentAnalysis();
    });
    
    document.getElementById('equipment-component').addEventListener('change', function() {
        updateEquipmentFilters('component');
        updateEquipmentAnalysis();
    });
    
    document.getElementById('equipment-parameter').addEventListener('change', updateEquipmentAnalysis);
    document.getElementById('export-equipment-btn').addEventListener('click', exportEquipmentData);
    
    // Trend Analysis tab
    document.getElementById('trend-parameter').addEventListener('change', updateTrendAnalysis);
    document.getElementById('trend-vessel').addEventListener('change', updateTrendAnalysis);
    document.getElementById('trend-range').addEventListener('change', updateTrendAnalysis);
    document.getElementById('export-trend-btn').addEventListener('click', exportTrendData);
    
    // Raw Data tab
    document.getElementById('raw-search').addEventListener('input', updateRawDataView);
    document.getElementById('raw-vessel').addEventListener('change', updateRawDataView);
    document.getElementById('raw-parameter').addEventListener('change', updateRawDataView);
    document.getElementById('raw-range').addEventListener('change', updateRawDataView);
    document.getElementById('raw-prev-page').addEventListener('click', function() {
        const currentPage = parseInt(document.getElementById('raw-current-page').textContent);
        if (currentPage > 1) {
            document.getElementById('raw-current-page').textContent = currentPage - 1;
            updateRawDataView();
        }
    });
    document.getElementById('raw-next-page').addEventListener('click', function() {
        const currentPage = parseInt(document.getElementById('raw-current-page').textContent);
        const totalPages = parseInt(document.getElementById('raw-total-pages').textContent);
        if (currentPage < totalPages) {
            document.getElementById('raw-current-page').textContent = currentPage + 1;
            updateRawDataView();
        }
    });
    document.getElementById('export-raw-btn').addEventListener('click', exportRawData);
    
    // Missing Readings tab
    document.getElementById('missing-vessel').addEventListener('change', updateMissingReadingsView);
    document.getElementById('missing-threshold').addEventListener('change', updateMissingReadingsView);
    document.getElementById('missing-sort').addEventListener('change', updateMissingReadingsView);
    document.getElementById('export-missing-btn').addEventListener('click', exportMissingData);
    
    // Process button
    document.getElementById('process-btn').addEventListener('click', processFiles);
}

// Handle uploaded files
function handleFiles(files) {
    const fileList = document.getElementById('file-list');
    fileList.innerHTML = '';
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileItem = document.createElement('div');
        fileItem.className = 'p-4 flex items-center justify-between';
        
        // Extract vessel name from filename with improved extraction
        const vesselName = extractVesselName(file.name);
        
        fileItem.innerHTML = `
            <div class="flex items-center">
                <svg class="w-8 h-8 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <div>
                    <div class="font-medium">${file.name}</div>
                    <div class="text-sm text-gray-500">Vessel: ${vesselName}, Size: ${formatFileSize(file.size)}</div>
                </div>
            </div>
            <div class="text-green-500 text-sm font-medium">Ready to process</div>
        `;
        
        fileList.appendChild(fileItem);
    }
    
    // Show file list if files are uploaded
    if (files.length > 0) {
        fileList.classList.remove('hidden');
        document.querySelector('#file-list .text-gray-500.p-4.text-center')?.remove();
    }
}

// Extract vessel name from filename with improved extraction
function extractVesselName(filename) {
    // Remove file extension
    let vesselName = filename.replace(/\.[^/.]+$/, "");
    
    // Remove "CBM" and clean up the name
    vesselName = vesselName.replace(/CBM/i, "").trim();
    
    // Handle common prefixes and suffixes
    vesselName = vesselName.replace(/^(MV|MT|SS|MS)\s+/i, "");
    
    return vesselName;
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Process uploaded files with improved error handling
function processFiles() {
    const fileInput = document.getElementById('file-input');
    const files = fileInput.files;
    
    if (files.length === 0) {
        showToast('Please upload files first', 'error');
        return;
    }
    
    // Show processing indicator
    const processingResults = document.getElementById('processing-results');
    processingResults.classList.remove('hidden');
    
    // Get processing options
    const processVibration = document.getElementById('process-vibration').checked;
    const processRPM = document.getElementById('process-rpm').checked;
    const processAmpere = document.getElementById('process-ampere').checked;
    
    // Start processing timer
    const startTime = performance.now();
    
    // Process each file
    let totalRecords = 0;
    let processedFiles = 0;
    
    // Clear existing data
    dashboardData.vessels = [];
    dashboardData.equipmentCodes = {};
    dashboardData.components = {};
    dashboardData.mpNames = {};
    dashboardData.compCodes = {};
    dashboardData.readings = [];
    dashboardData.relationships = {
        vessel: {
            equipmentCodes: {},
            components: {},
            mpNames: {},
            compCodes: {}
        },
        equipmentCode: {
            vessels: {},
            components: {},
            mpNames: {},
            compCodes: {}
        },
        component: {
            vessels: {},
            equipmentCodes: {},
            mpNames: {},
            compCodes: {}
        },
        mpName: {
            vessels: {},
            equipmentCodes: {},
            components: {},
            compCodes: {}
        },
        compCode: {
            vessels: {},
            equipmentCodes: {},
            components: {},
            mpNames: {}
        }
    };
    dashboardData.filterCache = {};
    
    // Process files sequentially with improved error handling
    processNextFile(files, 0, processVibration, processRPM, processAmpere, startTime, totalRecords, processedFiles);
}

// Process files sequentially with improved error handling
function processNextFile(files, index, processVibration, processRPM, processAmpere, startTime, totalRecords, processedFiles) {
    if (index >= files.length) {
        // All files processed
        finishProcessing(startTime, totalRecords, processedFiles);
        return;
    }
    
    const file = files[index];
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Process the first sheet
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            // Extract vessel name from filename with improved extraction
            const vesselName = extractVesselName(file.name);
            
            // Add vessel to list if not already present
            if (!dashboardData.vessels.includes(vesselName)) {
                dashboardData.vessels.push(vesselName);
            }
            
            // Process each row with improved data extraction
            const fileRecords = processExcelData(jsonData, vesselName, processVibration, processRPM, processAmpere);
            
            // Update total records
            totalRecords += fileRecords;
            processedFiles++;
            
            // Update processing results
            document.getElementById('processed-files').textContent = processedFiles;
            document.getElementById('processed-records').textContent = totalRecords;
            
            // Process next file
            processNextFile(files, index + 1, processVibration, processRPM, processAmpere, startTime, totalRecords, processedFiles);
        } catch (error) {
            console.error('Error processing file:', error);
            showToast('Error processing file: ' + error.message, 'error');
            
            // Process next file despite error
            processNextFile(files, index + 1, processVibration, processRPM, processAmpere, startTime, totalRecords, processedFiles);
        }
    };
    
    reader.onerror = function() {
        console.error('Error reading file');
        showToast('Error reading file', 'error');
        
        // Process next file despite error
        processNextFile(files, index + 1, processVibration, processRPM, processAmpere, startTime, totalRecords, processedFiles);
    };
    
    // Read the file
    reader.readAsArrayBuffer(file);
}

// Process Excel data with improved data extraction and relationship building
function processExcelData(jsonData, vesselName, processVibration, processRPM, processAmpere) {
    let recordCount = 0;
    
    // Process each row
    jsonData.forEach(row => {
        try {
            // Skip rows without equipment code
            if (!row.MP_NUMBER) {
                return;
            }
            
            // Get equipment code and component
            const equipmentCode = String(row.MP_NUMBER);
            const component = String(row.COMP_NAME || '');
            const mpName = String(row.MP_NAME || '');
            const compCode = String(row.COMP_NUMBER || '');
            
            // Add equipment code to list if not already present
            if (!dashboardData.equipmentCodes[vesselName]) {
                dashboardData.equipmentCodes[vesselName] = [];
            }
            if (!dashboardData.equipmentCodes[vesselName].includes(equipmentCode)) {
                dashboardData.equipmentCodes[vesselName].push(equipmentCode);
            }
            
            // Add component to list if not already present
            if (!dashboardData.components[equipmentCode]) {
                dashboardData.components[equipmentCode] = [];
            }
            if (!dashboardData.components[equipmentCode].includes(component) && component) {
                dashboardData.components[equipmentCode].push(component);
            }
            
            // Add MP_NAME to list if not already present
            if (!dashboardData.mpNames[vesselName]) {
                dashboardData.mpNames[vesselName] = [];
            }
            if (!dashboardData.mpNames[vesselName].includes(mpName) && mpName) {
                dashboardData.mpNames[vesselName].push(mpName);
            }
            
            // Add COMP_NUMBER to list if not already present
            if (!dashboardData.compCodes[vesselName]) {
                dashboardData.compCodes[vesselName] = [];
            }
            if (!dashboardData.compCodes[vesselName].includes(compCode) && compCode) {
                dashboardData.compCodes[vesselName].push(compCode);
            }
            
            // Build enhanced bidirectional relationships
            // Vessel to equipment code
            if (!dashboardData.relationships.vessel.equipmentCodes[vesselName]) {
                dashboardData.relationships.vessel.equipmentCodes[vesselName] = [];
            }
            if (!dashboardData.relationships.vessel.equipmentCodes[vesselName].includes(equipmentCode)) {
                dashboardData.relationships.vessel.equipmentCodes[vesselName].push(equipmentCode);
            }
            
            // Equipment code to vessel
            if (!dashboardData.relationships.equipmentCode.vessels[equipmentCode]) {
                dashboardData.relationships.equipmentCode.vessels[equipmentCode] = [];
            }
            if (!dashboardData.relationships.equipmentCode.vessels[equipmentCode].includes(vesselName)) {
                dashboardData.relationships.equipmentCode.vessels[equipmentCode].push(vesselName);
            }
            
            // Vessel to component
            if (!dashboardData.relationships.vessel.components[vesselName]) {
                dashboardData.relationships.vessel.components[vesselName] = [];
            }
            if (!dashboardData.relationships.vessel.components[vesselName].includes(component) && component) {
                dashboardData.relationships.vessel.components[vesselName].push(component);
            }
            
            // Component to vessel
            if (!dashboardData.relationships.component.vessels[component]) {
                dashboardData.relationships.component.vessels[component] = [];
            }
            if (!dashboardData.relationships.component.vessels[component].includes(vesselName) && component) {
                dashboardData.relationships.component.vessels[component].push(vesselName);
            }
            
            // Equipment code to component
            if (!dashboardData.relationships.equipmentCode.components[equipmentCode]) {
                dashboardData.relationships.equipmentCode.components[equipmentCode] = [];
            }
            if (!dashboardData.relationships.equipmentCode.components[equipmentCode].includes(component) && component) {
                dashboardData.relationships.equipmentCode.components[equipmentCode].push(component);
            }
            
            // Component to equipment code
            if (!dashboardData.relationships.component.equipmentCodes[component]) {
                dashboardData.relationships.component.equipmentCodes[component] = [];
            }
            if (!dashboardData.relationships.component.equipmentCodes[component].includes(equipmentCode) && component) {
                dashboardData.relationships.component.equipmentCodes[component].push(equipmentCode);
            }
            
            // MP_NAME relationships
            if (mpName) {
                // MP_NAME to vessel
                if (!dashboardData.relationships.mpName.vessels[mpName]) {
                    dashboardData.relationships.mpName.vessels[mpName] = [];
                }
                if (!dashboardData.relationships.mpName.vessels[mpName].includes(vesselName)) {
                    dashboardData.relationships.mpName.vessels[mpName].push(vesselName);
                }
                
                // MP_NAME to equipment code
                if (!dashboardData.relationships.mpName.equipmentCodes[mpName]) {
                    dashboardData.relationships.mpName.equipmentCodes[mpName] = [];
                }
                if (!dashboardData.relationships.mpName.equipmentCodes[mpName].includes(equipmentCode)) {
                    dashboardData.relationships.mpName.equipmentCodes[mpName].push(equipmentCode);
                }
                
                // MP_NAME to component
                if (!dashboardData.relationships.mpName.components[mpName]) {
                    dashboardData.relationships.mpName.components[mpName] = [];
                }
                if (!dashboardData.relationships.mpName.components[mpName].includes(component) && component) {
                    dashboardData.relationships.mpName.components[mpName].push(component);
                }
            }
            
            // COMP_NUMBER relationships
            if (compCode) {
                // COMP_NUMBER to vessel
                if (!dashboardData.relationships.compCode.vessels[compCode]) {
                    dashboardData.relationships.compCode.vessels[compCode] = [];
                }
                if (!dashboardData.relationships.compCode.vessels[compCode].includes(vesselName)) {
                    dashboardData.relationships.compCode.vessels[compCode].push(vesselName);
                }
                
                // COMP_NUMBER to equipment code
                if (!dashboardData.relationships.compCode.equipmentCodes[compCode]) {
                    dashboardData.relationships.compCode.equipmentCodes[compCode] = [];
                }
                if (!dashboardData.relationships.compCode.equipmentCodes[compCode].includes(equipmentCode)) {
                    dashboardData.relationships.compCode.equipmentCodes[compCode].push(equipmentCode);
                }
                
                // COMP_NUMBER to component
                if (!dashboardData.relationships.compCode.components[compCode]) {
                    dashboardData.relationships.compCode.components[compCode] = [];
                }
                if (!dashboardData.relationships.compCode.components[compCode].includes(component) && component) {
                    dashboardData.relationships.compCode.components[compCode].push(component);
                }
            }
            
            // Format timestamp with improved handling
            let timestamp;
            try {
                timestamp = formatTimestamp(row.DATE, row.TIME);
            } catch (e) {
                console.warn('Error formatting timestamp:', e);
                timestamp = new Date().toISOString();
            }
            
            // Process vibration data
            if (processVibration) {
                // Velocity
                if ('Vel, Rms (RMS)' in row && row['Vel, Rms (RMS)'] !== null && row['Vel, Rms (RMS)'] !== undefined) {
                    addReading(vesselName, equipmentCode, component, mpName, compCode, timestamp, 'Vel, Rms (RMS)', row['Vel, Rms (RMS)']);
                    recordCount++;
                }
                
                // Displacement
                if ('Disp, Rms (RMS)' in row && row['Disp, Rms (RMS)'] !== null && row['Disp, Rms (RMS)'] !== undefined) {
                    addReading(vesselName, equipmentCode, component, mpName, compCode, timestamp, 'Disp, Rms (RMS)', row['Disp, Rms (RMS)']);
                    recordCount++;
                }
                
                // Acceleration
                if ('Acc, Rms (RMS)' in row && row['Acc, Rms (RMS)'] !== null && row['Acc, Rms (RMS)'] !== undefined) {
                    addReading(vesselName, equipmentCode, component, mpName, compCode, timestamp, 'Acc, Rms (RMS)', row['Acc, Rms (RMS)']);
                    recordCount++;
                }
            }
            
            // Process RPM data
            if (processRPM && 'RPM1' in row && row.RPM1 !== null && row.RPM1 !== undefined) {
                addReading(vesselName, equipmentCode, component, mpName, compCode, timestamp, 'RPM1', row.RPM1);
                recordCount++;
            }
            
            // Process Ampere data
            if (processAmpere && 'ALT_1' in row && row.ALT_1 !== null && row.ALT_1 !== undefined) {
                addReading(vesselName, equipmentCode, component, mpName, compCode, timestamp, 'ALT_1', row.ALT_1);
                recordCount++;
            }
            
            // Process all other numeric parameters
            for (const key in row) {
                if (key !== 'Vel, Rms (RMS)' && key !== 'Disp, Rms (RMS)' && key !== 'Acc, Rms (RMS)' && 
                    key !== 'RPM1' && key !== 'ALT_1' && key !== 'DATE' && key !== 'TIME' && 
                    key !== 'MP_NUMBER' && key !== 'MP_NAME' && key !== 'COMP_NUMBER' && key !== 'COMP_NAME') {
                    
                    const value = row[key];
                    if (value !== null && value !== undefined && typeof value === 'number') {
                        // Add parameter metadata if not exists
                        if (!dashboardData.parameters[key]) {
                            dashboardData.parameters[key] = { unit: "" };
                        }
                        
                        addReading(vesselName, equipmentCode, component, mpName, compCode, timestamp, key, value);
                        recordCount++;
                    }
                }
            }
        } catch (error) {
            console.error('Error processing row:', error, row);
        }
    });
    
    return recordCount;
}

// Format timestamp with improved handling for various date formats
function formatTimestamp(date, time) {
    // Handle different date formats
    let dateObj;
    
    // Handle Excel numeric date format
    if (typeof date === 'number') {
        // Excel dates are number of days since 1900-01-01
        const excelEpoch = new Date(1900, 0, 1);
        dateObj = new Date(excelEpoch);
        dateObj.setDate(excelEpoch.getDate() + date - 1); // -1 because Excel counts from 1/1/1900, but 1/1/1900 is day 1
    } 
    // Handle JavaScript Date object
    else if (date instanceof Date) {
        dateObj = new Date(date);
    }
    // Handle string date format
    else if (typeof date === 'string') {
        // Try to parse the date string
        dateObj = moment(date).toDate();
    }
    // Handle timestamp object from pandas
    else if (date && typeof date.getTime === 'function') {
        dateObj = new Date(date.getTime());
    }
    else {
        // Default to current date if we can't parse
        dateObj = new Date();
    }
    
    // Add time component if available
    if (time !== undefined && time !== null) {
        // Handle numeric time (fraction of day)
        if (typeof time === 'number') {
            const seconds = time * 24 * 60 * 60;
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            
            dateObj.setHours(hours, minutes, secs);
        }
        // Handle string time format (HH:MM:SS)
        else if (typeof time === 'string') {
            const timeParts = time.split(':');
            if (timeParts.length >= 2) {
                const hours = parseInt(timeParts[0], 10);
                const minutes = parseInt(timeParts[1], 10);
                const seconds = timeParts.length > 2 ? parseInt(timeParts[2], 10) : 0;
                
                dateObj.setHours(hours, minutes, seconds);
            }
        }
        // Handle time object
        else if (time && typeof time.getHours === 'function') {
            dateObj.setHours(time.getHours(), time.getMinutes(), time.getSeconds());
        }
    }
    
    return dateObj.toISOString();
}

// Add reading to data store
function addReading(vessel, equipmentCode, component, mpName, compCode, timestamp, parameter, value) {
    // Convert value to number if it's not already
    if (typeof value !== 'number') {
        value = parseFloat(value);
    }
    
    // Skip if value is NaN
    if (isNaN(value)) {
        return;
    }
    
    // Add reading to data store
    dashboardData.readings.push({
        vessel: vessel,
        equipmentCode: equipmentCode,
        component: component,
        mpName: mpName,
        compCode: compCode,
        timestamp: timestamp,
        parameter: parameter,
        value: value
    });
}

// Finish processing
function finishProcessing(startTime, totalRecords, processedFiles) {
    // Calculate processing time
    const endTime = performance.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(2);
    
    // Update processing results
    document.getElementById('processing-time').textContent = processingTime + 's';
    
    // Show success message
    showToast(`Successfully processed ${totalRecords} records from ${processedFiles} files`, 'success');
    
    // Update vessel dropdowns
    updateAllDropdowns();
    
    // Save data to localStorage
    saveDataToLocalStorage();
    
    // Switch to Equipment Analysis tab
    document.querySelector('[data-tab="equipment"]').click();
}

// Update all dropdowns
function updateAllDropdowns() {
    // Sort vessels alphabetically
    dashboardData.vessels.sort();
    
    // Equipment Analysis tab
    const equipmentVesselSelect = document.getElementById('equipment-vessel');
    equipmentVesselSelect.innerHTML = '<option value="">Select Vessel</option>';
    
    // Trend Analysis tab
    const trendVesselSelect = document.getElementById('trend-vessel');
    trendVesselSelect.innerHTML = '<option value="">All Vessels</option>';
    
    // Raw Data tab
    const rawVesselSelect = document.getElementById('raw-vessel');
    rawVesselSelect.innerHTML = '<option value="">All Vessels</option>';
    
    // Missing Readings tab
    const missingVesselSelect = document.getElementById('missing-vessel');
    missingVesselSelect.innerHTML = '<option value="">All Vessels</option>';
    
    // Add vessels to dropdowns
    dashboardData.vessels.forEach(vessel => {
        // Equipment Analysis tab
        const equipmentOption = document.createElement('option');
        equipmentOption.value = vessel;
        equipmentOption.textContent = vessel;
        equipmentVesselSelect.appendChild(equipmentOption);
        
        // Trend Analysis tab
        const trendOption = document.createElement('option');
        trendOption.value = vessel;
        trendOption.textContent = vessel;
        trendVesselSelect.appendChild(trendOption);
        
        // Raw Data tab
        const rawOption = document.createElement('option');
        rawOption.value = vessel;
        rawOption.textContent = vessel;
        rawVesselSelect.appendChild(rawOption);
        
        // Missing Readings tab
        const missingOption = document.createElement('option');
        missingOption.value = vessel;
        missingOption.textContent = vessel;
        missingVesselSelect.appendChild(missingOption);
    });
    
    // Update equipment codes, components, and parameters
    updateEquipmentFilters('init');
    
    // Update parameter dropdowns
    updateParameterDropdowns();
}

// Update parameter dropdowns
function updateParameterDropdowns() {
    // Get all parameters
    const parameters = Object.keys(dashboardData.parameters);
    
    // Sort parameters alphabetically
    parameters.sort();
    
    // Equipment Analysis tab
    const equipmentParameterSelect = document.getElementById('equipment-parameter');
    equipmentParameterSelect.innerHTML = '';
    
    // Trend Analysis tab
    const trendParameterSelect = document.getElementById('trend-parameter');
    trendParameterSelect.innerHTML = '';
    
    // Raw Data tab
    const rawParameterSelect = document.getElementById('raw-parameter');
    rawParameterSelect.innerHTML = '<option value="">All Parameters</option>';
    
    // Add parameters to dropdowns
    parameters.forEach(parameter => {
        // Equipment Analysis tab
        const equipmentOption = document.createElement('option');
        equipmentOption.value = parameter;
        equipmentOption.textContent = parameter;
        equipmentParameterSelect.appendChild(equipmentOption);
        
        // Trend Analysis tab
        const trendOption = document.createElement('option');
        trendOption.value = parameter;
        trendOption.textContent = parameter;
        trendParameterSelect.appendChild(trendOption);
        
        // Raw Data tab
        const rawOption = document.createElement('option');
        rawOption.value = parameter;
        rawOption.textContent = parameter;
        rawParameterSelect.appendChild(rawOption);
    });
}

// Update equipment filters based on selected values with enhanced independent selection
function updateEquipmentFilters(changedFilter) {
    const vessel = document.getElementById('equipment-vessel').value;
    const equipmentCode = document.getElementById('equipment-code').value;
    const component = document.getElementById('equipment-component').value;
    
    // Generate cache key for this filter state
    const cacheKey = `${vessel}|${equipmentCode}|${component}|${changedFilter}`;
    
    // Check if we have cached results for this filter state
    if (dashboardData.filterCache[cacheKey]) {
        // Use cached results
        const cachedResult = dashboardData.filterCache[cacheKey];
        
        if (cachedResult.equipmentCodes) {
            updateDropdownFromCache('equipment-code', cachedResult.equipmentCodes);
        }
        
        if (cachedResult.components) {
            updateDropdownFromCache('equipment-component', cachedResult.components);
        }
        
        return;
    }
    
    // Update equipment code dropdown
    if (changedFilter === 'init' || changedFilter === 'vessel' || changedFilter === 'component') {
        let equipmentCodes = [];
        
        if (vessel && component) {
            // Get equipment codes for selected vessel and component
            if (dashboardData.relationships.vessel.equipmentCodes[vessel] && 
                dashboardData.relationships.component.equipmentCodes[component]) {
                
                // Find intersection of equipment codes
                equipmentCodes = dashboardData.relationships.vessel.equipmentCodes[vessel].filter(
                    code => dashboardData.relationships.component.equipmentCodes[component].includes(code)
                );
            }
        } else if (vessel) {
            // Get equipment codes for selected vessel
            equipmentCodes = dashboardData.relationships.vessel.equipmentCodes[vessel] || [];
        } else if (component) {
            // Get equipment codes for selected component
            equipmentCodes = dashboardData.relationships.component.equipmentCodes[component] || [];
        } else {
            // Get all equipment codes
            for (const v in dashboardData.equipmentCodes) {
                equipmentCodes = equipmentCodes.concat(dashboardData.equipmentCodes[v]);
            }
            // Remove duplicates
            equipmentCodes = [...new Set(equipmentCodes)];
        }
        
        // Sort equipment codes alphabetically
        equipmentCodes.sort();
        
        // Update dropdown
        const equipmentCodeSelect = document.getElementById('equipment-code');
        const currentValue = equipmentCodeSelect.value;
        equipmentCodeSelect.innerHTML = '<option value="">All Equipment Codes</option>';
        
        equipmentCodes.forEach(code => {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = code;
            equipmentCodeSelect.appendChild(option);
        });
        
        // Restore selected value if still in list
        if (currentValue && equipmentCodes.includes(currentValue)) {
            equipmentCodeSelect.value = currentValue;
        }
        
        // Cache the results
        if (!dashboardData.filterCache[cacheKey]) {
            dashboardData.filterCache[cacheKey] = {};
        }
        dashboardData.filterCache[cacheKey].equipmentCodes = {
            options: equipmentCodes,
            selectedValue: equipmentCodeSelect.value
        };
    }
    
    // Update component dropdown
    if (changedFilter === 'init' || changedFilter === 'vessel' || changedFilter === 'equipmentCode') {
        let components = [];
        
        if (vessel && equipmentCode) {
            // Get components for selected vessel and equipment code
            if (dashboardData.relationships.vessel.components[vessel] && 
                dashboardData.relationships.equipmentCode.components[equipmentCode]) {
                
                // Find intersection of components
                components = dashboardData.relationships.vessel.components[vessel].filter(
                    comp => dashboardData.relationships.equipmentCode.components[equipmentCode].includes(comp)
                );
            }
        } else if (vessel) {
            // Get components for selected vessel
            components = dashboardData.relationships.vessel.components[vessel] || [];
        } else if (equipmentCode) {
            // Get components for selected equipment code
            components = dashboardData.relationships.equipmentCode.components[equipmentCode] || [];
        } else {
            // Get all components
            for (const e in dashboardData.components) {
                components = components.concat(dashboardData.components[e]);
            }
            // Remove duplicates
            components = [...new Set(components)];
        }
        
        // Sort components alphabetically
        components.sort();
        
        // Update dropdown
        const componentSelect = document.getElementById('equipment-component');
        const currentValue = componentSelect.value;
        componentSelect.innerHTML = '<option value="">All Components</option>';
        
        components.forEach(comp => {
            const option = document.createElement('option');
            option.value = comp;
            option.textContent = comp;
            componentSelect.appendChild(option);
        });
        
        // Restore selected value if still in list
        if (currentValue && components.includes(currentValue)) {
            componentSelect.value = currentValue;
        }
        
        // Cache the results
        if (!dashboardData.filterCache[cacheKey]) {
            dashboardData.filterCache[cacheKey] = {};
        }
        dashboardData.filterCache[cacheKey].components = {
            options: components,
            selectedValue: componentSelect.value
        };
    }
}

// Update dropdown from cache
function updateDropdownFromCache(dropdownId, cacheData) {
    const dropdown = document.getElementById(dropdownId);
    const currentValue = dropdown.value;
    
    // Determine placeholder text based on dropdown type
    let placeholderText = 'All';
    if (dropdownId === 'equipment-code') {
        placeholderText = 'All Equipment Codes';
    } else if (dropdownId === 'equipment-component') {
        placeholderText = 'All Components';
    }
    
    dropdown.innerHTML = `<option value="">${placeholderText}</option>`;
    
    cacheData.options.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        dropdown.appendChild(option);
    });
    
    // Restore selected value if still in list
    if (currentValue && cacheData.options.includes(currentValue)) {
        dropdown.value = currentValue;
    } else if (cacheData.selectedValue) {
        dropdown.value = cacheData.selectedValue;
    }
}

// Update equipment analysis with improved chart rendering
function updateEquipmentAnalysis() {
    const vessel = document.getElementById('equipment-vessel').value;
    const equipmentCode = document.getElementById('equipment-code').value;
    const component = document.getElementById('equipment-component').value;
    const parameter = document.getElementById('equipment-parameter').value;
    
    // Filter readings
    let filteredReadings = dashboardData.readings;
    
    if (vessel) {
        filteredReadings = filteredReadings.filter(reading => reading.vessel === vessel);
    }
    
    if (equipmentCode) {
        filteredReadings = filteredReadings.filter(reading => reading.equipmentCode === equipmentCode);
    }
    
    if (component) {
        filteredReadings = filteredReadings.filter(reading => reading.component === component);
    }
    
    if (parameter) {
        filteredReadings = filteredReadings.filter(reading => reading.parameter === parameter);
    }
    
    // Sort readings by timestamp
    filteredReadings.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Update trend chart
    updateEquipmentTrendChart(filteredReadings, parameter);
    
    // Update RPM vs Ampere chart
    updateRPMvsAmpereChart(vessel, equipmentCode, component);
    
    // Update recent readings table
    updateRecentReadingsTable(filteredReadings);
}

// Update equipment trend chart with improved rendering
function updateEquipmentTrendChart(readings, parameter) {
    const canvas = document.getElementById('equipment-trend-chart');
    
    // Destroy existing chart
    if (dashboardData.charts.equipmentTrend) {
        dashboardData.charts.equipmentTrend.destroy();
    }
    
    // Check if we have data
    if (readings.length === 0 || !parameter) {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        return;
    }
    
    // Filter readings by parameter
    const parameterReadings = readings.filter(reading => reading.parameter === parameter);
    
    // Check if we have data for this parameter
    if (parameterReadings.length === 0) {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        return;
    }
    
    // Prepare data for chart
    const labels = parameterReadings.map(reading => {
        const date = new Date(reading.timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    });
    
    const values = parameterReadings.map(reading => reading.value);
    
    // Get parameter metadata
    const parameterInfo = dashboardData.parameters[parameter] || {};
    const unit = parameterInfo.unit || '';
    const thresholdWarning = parameterInfo.thresholdWarning;
    const thresholdCritical = parameterInfo.thresholdCritical;
    
    // Create datasets
    const datasets = [
        {
            label: parameter + (unit ? ` (${unit})` : ''),
            data: values,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            tension: 0.1,
            fill: true
        }
    ];
    
    // Add threshold lines if available
    if (thresholdWarning !== undefined) {
        datasets.push({
            label: 'Warning Threshold',
            data: Array(labels.length).fill(thresholdWarning),
            borderColor: 'rgb(245, 158, 11)',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false
        });
    }
    
    if (thresholdCritical !== undefined) {
        datasets.push({
            label: 'Critical Threshold',
            data: Array(labels.length).fill(thresholdCritical),
            borderColor: 'rgb(239, 68, 68)',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false
        });
    }
    
    // Create chart
    dashboardData.charts.equipmentTrend = new Chart(canvas, {
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
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            return `${context.dataset.label}: ${value}`;
                        }
                    }
                }
            }
        }
    });
}

// Update RPM vs Ampere chart with improved rendering
function updateRPMvsAmpereChart(vessel, equipmentCode, component) {
    const canvas = document.getElementById('rpm-ampere-chart');
    
    // Destroy existing chart
    if (dashboardData.charts.rpmAmpere) {
        dashboardData.charts.rpmAmpere.destroy();
    }
    
    // Filter readings
    let filteredReadings = dashboardData.readings;
    
    if (vessel) {
        filteredReadings = filteredReadings.filter(reading => reading.vessel === vessel);
    }
    
    if (equipmentCode) {
        filteredReadings = filteredReadings.filter(reading => reading.equipmentCode === equipmentCode);
    }
    
    if (component) {
        filteredReadings = filteredReadings.filter(reading => reading.component === component);
    }
    
    // Group readings by timestamp
    const readingsByTimestamp = {};
    
    filteredReadings.forEach(reading => {
        if (!readingsByTimestamp[reading.timestamp]) {
            readingsByTimestamp[reading.timestamp] = {};
        }
        
        readingsByTimestamp[reading.timestamp][reading.parameter] = reading.value;
    });
    
    // Extract RPM and Ampere data
    const data = [];
    
    Object.keys(readingsByTimestamp).forEach(timestamp => {
        const readings = readingsByTimestamp[timestamp];
        
        if (readings.RPM1 !== undefined && readings.ALT_1 !== undefined) {
            data.push({
                rpm: readings.RPM1,
                ampere: readings.ALT_1,
                timestamp: timestamp
            });
        }
    });
    
    // Check if we have data
    if (data.length === 0) {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        return;
    }
    
    // Sort data by timestamp
    data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Prepare data for chart
    const timestamps = data.map(item => {
        const date = new Date(item.timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    });
    
    // Create chart
    dashboardData.charts.rpmAmpere = new Chart(canvas, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'RPM vs Ampere',
                data: data.map((item, index) => ({
                    x: item.rpm,
                    y: item.ampere,
                    timestamp: timestamps[index]
                })),
                backgroundColor: 'rgb(59, 130, 246)',
                borderColor: 'rgb(59, 130, 246)',
                borderWidth: 1,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'RPM'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Ampere'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const dataPoint = context.raw;
                            return [
                                `Timestamp: ${dataPoint.timestamp}`,
                                `RPM: ${dataPoint.x}`,
                                `Ampere: ${dataPoint.y}`
                            ];
                        }
                    }
                }
            }
        }
    });
}

// Update recent readings table
function updateRecentReadingsTable(readings) {
    const tableBody = document.getElementById('equipment-readings');
    
    // Clear table
    tableBody.innerHTML = '';
    
    // Check if we have data
    if (readings.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="6" class="px-4 py-4 text-center text-gray-500">No data available</td>';
        tableBody.appendChild(row);
        return;
    }
    
    // Sort readings by timestamp (newest first)
    readings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Show only the 10 most recent readings
    const recentReadings = readings.slice(0, 10);
    
    // Add rows to table
    recentReadings.forEach(reading => {
        const row = document.createElement('tr');
        
        // Format timestamp
        const date = new Date(reading.timestamp);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        
        // Get parameter metadata
        const parameterInfo = dashboardData.parameters[reading.parameter] || {};
        const unit = parameterInfo.unit || '';
        const thresholdWarning = parameterInfo.thresholdWarning;
        const thresholdCritical = parameterInfo.thresholdCritical;
        
        // Determine status
        let status = 'good';
        let statusText = 'Good';
        
        if (thresholdCritical !== undefined && reading.value >= thresholdCritical) {
            status = 'critical';
            statusText = 'Critical';
        } else if (thresholdWarning !== undefined && reading.value >= thresholdWarning) {
            status = 'warning';
            statusText = 'Warning';
        }
        
        row.innerHTML = `
            <td class="px-4 py-2 whitespace-nowrap">${formattedDate}</td>
            <td class="px-4 py-2">${reading.equipmentCode}</td>
            <td class="px-4 py-2">${reading.component}</td>
            <td class="px-4 py-2">${reading.parameter}</td>
            <td class="px-4 py-2">${reading.value} ${unit}</td>
            <td class="px-4 py-2">
                <span class="status-indicator status-${status}"></span>
                ${statusText}
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Update trend analysis with improved chart rendering
function updateTrendAnalysis() {
    const parameter = document.getElementById('trend-parameter').value;
    const vessel = document.getElementById('trend-vessel').value;
    const range = parseInt(document.getElementById('trend-range').value);
    
    // Filter readings
    let filteredReadings = dashboardData.readings.filter(reading => reading.parameter === parameter);
    
    if (vessel) {
        filteredReadings = filteredReadings.filter(reading => reading.vessel === vessel);
    }
    
    if (range > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - range);
        
        filteredReadings = filteredReadings.filter(reading => new Date(reading.timestamp) >= cutoffDate);
    }
    
    // Sort readings by timestamp
    filteredReadings.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Update trend chart
    updateTrendChart(filteredReadings, parameter);
    
    // Update statistics
    updateTrendStatistics(filteredReadings);
}

// Update trend chart with improved rendering
function updateTrendChart(readings, parameter) {
    const canvas = document.getElementById('trend-chart');
    
    // Destroy existing chart
    if (dashboardData.charts.trend) {
        dashboardData.charts.trend.destroy();
    }
    
    // Check if we have data
    if (readings.length === 0) {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        return;
    }
    
    // Get parameter metadata
    const parameterInfo = dashboardData.parameters[parameter] || {};
    const unit = parameterInfo.unit || '';
    const thresholdWarning = parameterInfo.thresholdWarning;
    const thresholdCritical = parameterInfo.thresholdCritical;
    
    // Group readings by vessel
    const readingsByVessel = {};
    
    readings.forEach(reading => {
        if (!readingsByVessel[reading.vessel]) {
            readingsByVessel[reading.vessel] = [];
        }
        
        readingsByVessel[reading.vessel].push(reading);
    });
    
    // Prepare data for chart
    const datasets = [];
    const colors = [
        'rgb(59, 130, 246)', // Blue
        'rgb(16, 185, 129)', // Green
        'rgb(245, 158, 11)', // Amber
        'rgb(239, 68, 68)',  // Red
        'rgb(139, 92, 246)'  // Purple
    ];
    
    // Add datasets for each vessel
    Object.keys(readingsByVessel).forEach((vessel, index) => {
        const vesselReadings = readingsByVessel[vessel];
        
        // Sort readings by timestamp
        vesselReadings.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        datasets.push({
            label: vessel,
            data: vesselReadings.map(reading => ({
                x: new Date(reading.timestamp),
                y: reading.value
            })),
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length],
            borderWidth: 2,
            tension: 0.1,
            fill: false
        });
    });
    
    // Add threshold lines if available
    if (thresholdWarning !== undefined) {
        datasets.push({
            label: 'Warning Threshold',
            data: [
                { x: new Date(readings[0].timestamp), y: thresholdWarning },
                { x: new Date(readings[readings.length - 1].timestamp), y: thresholdWarning }
            ],
            borderColor: 'rgb(245, 158, 11)',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false
        });
    }
    
    if (thresholdCritical !== undefined) {
        datasets.push({
            label: 'Critical Threshold',
            data: [
                { x: new Date(readings[0].timestamp), y: thresholdCritical },
                { x: new Date(readings[readings.length - 1].timestamp), y: thresholdCritical }
            ],
            borderColor: 'rgb(239, 68, 68)',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false
        });
    }
    
    // Create chart
    dashboardData.charts.trend = new Chart(canvas, {
        type: 'line',
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day'
                    },
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: parameter + (unit ? ` (${unit})` : '')
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw.y;
                            return `${context.dataset.label}: ${value} ${unit}`;
                        }
                    }
                }
            }
        }
    });
}

// Update trend statistics with improved calculations
function updateTrendStatistics(readings) {
    // Check if we have data
    if (readings.length === 0) {
        document.getElementById('trend-average').textContent = '-';
        document.getElementById('trend-minimum').textContent = '-';
        document.getElementById('trend-maximum').textContent = '-';
        document.getElementById('trend-stddev').textContent = '-';
        return;
    }
    
    // Calculate statistics
    const values = readings.map(reading => reading.value);
    
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    
    // Calculate standard deviation
    const variance = values.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) / values.length;
    const stddev = Math.sqrt(variance);
    
    // Get parameter metadata
    const parameter = document.getElementById('trend-parameter').value;
    const parameterInfo = dashboardData.parameters[parameter] || {};
    const unit = parameterInfo.unit || '';
    
    // Update statistics
    document.getElementById('trend-average').textContent = average.toFixed(2) + ' ' + unit;
    document.getElementById('trend-minimum').textContent = minimum.toFixed(2) + ' ' + unit;
    document.getElementById('trend-maximum').textContent = maximum.toFixed(2) + ' ' + unit;
    document.getElementById('trend-stddev').textContent = stddev.toFixed(2) + ' ' + unit;
}

// Update raw data view with improved filtering
function updateRawDataView() {
    const search = document.getElementById('raw-search').value.toLowerCase();
    const vessel = document.getElementById('raw-vessel').value;
    const parameter = document.getElementById('raw-parameter').value;
    const range = parseInt(document.getElementById('raw-range').value);
    
    // Filter readings
    let filteredReadings = dashboardData.readings;
    
    if (search) {
        filteredReadings = filteredReadings.filter(reading => 
            reading.vessel.toLowerCase().includes(search) ||
            reading.equipmentCode.toLowerCase().includes(search) ||
            reading.component.toLowerCase().includes(search) ||
            reading.parameter.toLowerCase().includes(search)
        );
    }
    
    if (vessel) {
        filteredReadings = filteredReadings.filter(reading => reading.vessel === vessel);
    }
    
    if (parameter) {
        filteredReadings = filteredReadings.filter(reading => reading.parameter === parameter);
    }
    
    if (range > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - range);
        
        filteredReadings = filteredReadings.filter(reading => new Date(reading.timestamp) >= cutoffDate);
    }
    
    // Sort readings by timestamp (newest first)
    filteredReadings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Update record count
    document.getElementById('raw-record-count').textContent = filteredReadings.length;
    
    // Pagination
    const pageSize = 20;
    const currentPage = parseInt(document.getElementById('raw-current-page').textContent);
    const totalPages = Math.ceil(filteredReadings.length / pageSize) || 1;
    
    document.getElementById('raw-total-pages').textContent = totalPages;
    
    // Adjust current page if needed
    if (currentPage > totalPages) {
        document.getElementById('raw-current-page').textContent = totalPages;
    }
    
    // Update pagination buttons
    document.getElementById('raw-prev-page').disabled = currentPage <= 1;
    document.getElementById('raw-next-page').disabled = currentPage >= totalPages;
    
    // Get current page data
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageData = filteredReadings.slice(startIndex, endIndex);
    
    // Update table
    const tableBody = document.getElementById('raw-data-body');
    tableBody.innerHTML = '';
    
    // Check if we have data
    if (pageData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="6" class="px-4 py-4 text-center text-gray-500">No data available</td>';
        tableBody.appendChild(row);
        return;
    }
    
    // Add rows to table
    pageData.forEach(reading => {
        const row = document.createElement('tr');
        
        // Format timestamp
        const date = new Date(reading.timestamp);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        
        // Get parameter metadata
        const parameterInfo = dashboardData.parameters[reading.parameter] || {};
        const unit = parameterInfo.unit || '';
        
        row.innerHTML = `
            <td class="px-4 py-2 whitespace-nowrap">${formattedDate}</td>
            <td class="px-4 py-2">${reading.vessel}</td>
            <td class="px-4 py-2">${reading.equipmentCode}</td>
            <td class="px-4 py-2">${reading.component}</td>
            <td class="px-4 py-2">${reading.parameter}</td>
            <td class="px-4 py-2">${reading.value} ${unit}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Update missing readings view with improved calculations
function updateMissingReadingsView() {
    const vessel = document.getElementById('missing-vessel').value;
    const threshold = parseInt(document.getElementById('missing-threshold').value);
    const sortBy = document.getElementById('missing-sort').value;
    
    // Get current date
    const currentDate = new Date();
    
    // Group readings by equipment
    const lastReadingByEquipment = {};
    
    // Process all readings
    dashboardData.readings.forEach(reading => {
        const key = `${reading.vessel}|${reading.equipmentCode}|${reading.component}`;
        const readingDate = new Date(reading.timestamp);
        
        if (!lastReadingByEquipment[key] || readingDate > new Date(lastReadingByEquipment[key].timestamp)) {
            lastReadingByEquipment[key] = reading;
        }
    });
    
    // Filter by vessel if needed
    let equipmentKeys = Object.keys(lastReadingByEquipment);
    
    if (vessel) {
        equipmentKeys = equipmentKeys.filter(key => key.split('|')[0] === vessel);
    }
    
    // Calculate days since last reading and filter by threshold
    const missingEquipment = [];
    
    equipmentKeys.forEach(key => {
        const reading = lastReadingByEquipment[key];
        const lastReadingDate = new Date(reading.timestamp);
        const daysSinceLastReading = Math.floor((currentDate - lastReadingDate) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastReading >= threshold) {
            const [vessel, equipmentCode, component] = key.split('|');
            
            missingEquipment.push({
                vessel: vessel,
                equipmentCode: equipmentCode,
                component: component,
                lastReading: lastReadingDate,
                daysSinceLastReading: daysSinceLastReading
            });
        }
    });
    
    // Sort missing equipment
    if (sortBy === 'days') {
        missingEquipment.sort((a, b) => b.daysSinceLastReading - a.daysSinceLastReading);
    } else if (sortBy === 'vessel') {
        missingEquipment.sort((a, b) => a.vessel.localeCompare(b.vessel));
    } else if (sortBy === 'equipment') {
        missingEquipment.sort((a, b) => a.equipmentCode.localeCompare(b.equipmentCode));
    }
    
    // Update missing count
    document.getElementById('missing-count').textContent = missingEquipment.length;
    
    // Update table
    const tableBody = document.getElementById('missing-equipment-body');
    tableBody.innerHTML = '';
    
    // Check if we have data
    if (missingEquipment.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="5" class="px-4 py-4 text-center text-gray-500">No missing readings found</td>';
        tableBody.appendChild(row);
        return;
    }
    
    // Add rows to table
    missingEquipment.forEach(item => {
        const row = document.createElement('tr');
        
        // Format last reading date
        const formattedDate = item.lastReading.toLocaleDateString() + ' ' + item.lastReading.toLocaleTimeString();
        
        // Determine status class based on days since last reading
        let statusClass = '';
        
        if (item.daysSinceLastReading >= 90) {
            statusClass = 'text-red-600 font-medium';
        } else if (item.daysSinceLastReading >= 60) {
            statusClass = 'text-amber-600 font-medium';
        } else if (item.daysSinceLastReading >= 30) {
            statusClass = 'text-yellow-600';
        }
        
        row.innerHTML = `
            <td class="px-4 py-2">${item.vessel}</td>
            <td class="px-4 py-2">${item.equipmentCode}</td>
            <td class="px-4 py-2">${item.component}</td>
            <td class="px-4 py-2">${formattedDate}</td>
            <td class="px-4 py-2 ${statusClass}">${item.daysSinceLastReading} days</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Export equipment data
function exportEquipmentData() {
    const vessel = document.getElementById('equipment-vessel').value;
    const equipmentCode = document.getElementById('equipment-code').value;
    const component = document.getElementById('equipment-component').value;
    const parameter = document.getElementById('equipment-parameter').value;
    
    // Filter readings
    let filteredReadings = dashboardData.readings;
    
    if (vessel) {
        filteredReadings = filteredReadings.filter(reading => reading.vessel === vessel);
    }
    
    if (equipmentCode) {
        filteredReadings = filteredReadings.filter(reading => reading.equipmentCode === equipmentCode);
    }
    
    if (component) {
        filteredReadings = filteredReadings.filter(reading => reading.component === component);
    }
    
    if (parameter) {
        filteredReadings = filteredReadings.filter(reading => reading.parameter === parameter);
    }
    
    // Sort readings by timestamp
    filteredReadings.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Export data
    exportData(filteredReadings, 'equipment_data');
}

// Export trend data
function exportTrendData() {
    const parameter = document.getElementById('trend-parameter').value;
    const vessel = document.getElementById('trend-vessel').value;
    const range = parseInt(document.getElementById('trend-range').value);
    
    // Filter readings
    let filteredReadings = dashboardData.readings.filter(reading => reading.parameter === parameter);
    
    if (vessel) {
        filteredReadings = filteredReadings.filter(reading => reading.vessel === vessel);
    }
    
    if (range > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - range);
        
        filteredReadings = filteredReadings.filter(reading => new Date(reading.timestamp) >= cutoffDate);
    }
    
    // Sort readings by timestamp
    filteredReadings.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Export data
    exportData(filteredReadings, 'trend_data');
}

// Export raw data
function exportRawData() {
    const search = document.getElementById('raw-search').value.toLowerCase();
    const vessel = document.getElementById('raw-vessel').value;
    const parameter = document.getElementById('raw-parameter').value;
    const range = parseInt(document.getElementById('raw-range').value);
    
    // Filter readings
    let filteredReadings = dashboardData.readings;
    
    if (search) {
        filteredReadings = filteredReadings.filter(reading => 
            reading.vessel.toLowerCase().includes(search) ||
            reading.equipmentCode.toLowerCase().includes(search) ||
            reading.component.toLowerCase().includes(search) ||
            reading.parameter.toLowerCase().includes(search)
        );
    }
    
    if (vessel) {
        filteredReadings = filteredReadings.filter(reading => reading.vessel === vessel);
    }
    
    if (parameter) {
        filteredReadings = filteredReadings.filter(reading => reading.parameter === parameter);
    }
    
    if (range > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - range);
        
        filteredReadings = filteredReadings.filter(reading => new Date(reading.timestamp) >= cutoffDate);
    }
    
    // Sort readings by timestamp
    filteredReadings.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Export data
    exportData(filteredReadings, 'raw_data');
}

// Export missing data
function exportMissingData() {
    const vessel = document.getElementById('missing-vessel').value;
    const threshold = parseInt(document.getElementById('missing-threshold').value);
    
    // Get current date
    const currentDate = new Date();
    
    // Group readings by equipment
    const lastReadingByEquipment = {};
    
    // Process all readings
    dashboardData.readings.forEach(reading => {
        const key = `${reading.vessel}|${reading.equipmentCode}|${reading.component}`;
        const readingDate = new Date(reading.timestamp);
        
        if (!lastReadingByEquipment[key] || readingDate > new Date(lastReadingByEquipment[key].timestamp)) {
            lastReadingByEquipment[key] = reading;
        }
    });
    
    // Filter by vessel if needed
    let equipmentKeys = Object.keys(lastReadingByEquipment);
    
    if (vessel) {
        equipmentKeys = equipmentKeys.filter(key => key.split('|')[0] === vessel);
    }
    
    // Calculate days since last reading and filter by threshold
    const missingEquipment = [];
    
    equipmentKeys.forEach(key => {
        const reading = lastReadingByEquipment[key];
        const lastReadingDate = new Date(reading.timestamp);
        const daysSinceLastReading = Math.floor((currentDate - lastReadingDate) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastReading >= threshold) {
            const [vessel, equipmentCode, component] = key.split('|');
            
            missingEquipment.push({
                vessel: vessel,
                equipmentCode: equipmentCode,
                component: component,
                lastReading: lastReadingDate.toISOString(),
                daysSinceLastReading: daysSinceLastReading
            });
        }
    });
    
    // Sort missing equipment by days since last reading
    missingEquipment.sort((a, b) => b.daysSinceLastReading - a.daysSinceLastReading);
    
    // Export data
    exportCSV(missingEquipment, 'missing_readings');
}

// Export data to CSV
function exportData(readings, filename) {
    // Check if we have data
    if (readings.length === 0) {
        showToast('No data to export', 'error');
        return;
    }
    
    // Convert readings to CSV format
    const rows = [];
    
    // Add header row
    rows.push(['Timestamp', 'Vessel', 'Equipment Code', 'Component', 'Parameter', 'Value']);
    
    // Add data rows
    readings.forEach(reading => {
        // Format timestamp
        const date = new Date(reading.timestamp);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        
        rows.push([
            formattedDate,
            reading.vessel,
            reading.equipmentCode,
            reading.component,
            reading.parameter,
            reading.value
        ]);
    });
    
    // Convert to CSV
    const csvContent = rows.map(row => row.join(',')).join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Data exported successfully', 'success');
}

// Export data to CSV (generic version)
function exportCSV(data, filename) {
    // Check if we have data
    if (data.length === 0) {
        showToast('No data to export', 'error');
        return;
    }
    
    // Get headers from first object
    const headers = Object.keys(data[0]);
    
    // Convert data to CSV format
    const rows = [];
    
    // Add header row
    rows.push(headers.join(','));
    
    // Add data rows
    data.forEach(item => {
        const row = headers.map(header => item[header]);
        rows.push(row.join(','));
    });
    
    // Convert to CSV
    const csvContent = rows.join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Data exported successfully', 'success');
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    // Set message
    toastMessage.textContent = message;
    
    // Set color based on type
    if (type === 'success') {
        toast.className = 'bg-green-500 text-white px-6 py-3 rounded shadow-lg';
    } else if (type === 'error') {
        toast.className = 'bg-red-500 text-white px-6 py-3 rounded shadow-lg';
    } else if (type === 'warning') {
        toast.className = 'bg-yellow-500 text-white px-6 py-3 rounded shadow-lg';
    }
    
    // Show toast
    toast.classList.add('show');
    
    // Hide toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Save data to localStorage
function saveDataToLocalStorage() {
    try {
        localStorage.setItem('cbm_dashboard_data', JSON.stringify({
            vessels: dashboardData.vessels,
            equipmentCodes: dashboardData.equipmentCodes,
            components: dashboardData.components,
            mpNames: dashboardData.mpNames,
            compCodes: dashboardData.compCodes,
            readings: dashboardData.readings,
            relationships: dashboardData.relationships
        }));
        
        console.log('Data saved to localStorage');
    } catch (error) {
        console.error('Error saving data to localStorage:', error);
    }
}

// Load data from localStorage
function loadDataFromLocalStorage() {
    try {
        const savedData = localStorage.getItem('cbm_dashboard_data');
        
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            
            dashboardData.vessels = parsedData.vessels || [];
            dashboardData.equipmentCodes = parsedData.equipmentCodes || {};
            dashboardData.components = parsedData.components || {};
            dashboardData.mpNames = parsedData.mpNames || {};
            dashboardData.compCodes = parsedData.compCodes || {};
            dashboardData.readings = parsedData.readings || [];
            dashboardData.relationships = parsedData.relationships || {
                vessel: {
                    equipmentCodes: {},
                    components: {},
                    mpNames: {},
                    compCodes: {}
                },
                equipmentCode: {
                    vessels: {},
                    components: {},
                    mpNames: {},
                    compCodes: {}
                },
                component: {
                    vessels: {},
                    equipmentCodes: {},
                    mpNames: {},
                    compCodes: {}
                },
                mpName: {
                    vessels: {},
                    equipmentCodes: {},
                    components: {},
                    compCodes: {}
                },
                compCode: {
                    vessels: {},
                    equipmentCodes: {},
                    components: {},
                    mpNames: {}
                }
            };
            dashboardData.filterCache = {};
            
            console.log('Data loaded from localStorage');
            
            // Update UI
            if (dashboardData.vessels.length > 0) {
                updateAllDropdowns();
                showToast('Previous data loaded from localStorage', 'success');
            }
        }
    } catch (error) {
        console.error('Error loading data from localStorage:', error);
    }
}
