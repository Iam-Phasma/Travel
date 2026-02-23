// ============================================
// FILE PROCESSING UTILITIES (available immediately on script load)
// ============================================

// Convert images and PDFs to a single combined PDF
const combineFilesToPDF = async (files, taNumber) => {
    const { PDFDocument } = window.PDFLib;
    const finalPdf = await PDFDocument.create();

    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (file.type === 'application/pdf') {
            // Handle PDF - copy all pages
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            const copiedPages = await finalPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            copiedPages.forEach((page) => finalPdf.addPage(page));
        } else if (file.type.startsWith('image/')) {
            // Handle image - add as new page
            const imgData = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });

            // Get image dimensions
            const img = await new Promise((resolve) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.src = imgData;
            });

            // Create a new page in A4 size
            const pageWidth = 595.28; // A4 width in points
            const pageHeight = 841.89; // A4 height in points
            const page = finalPdf.addPage([pageWidth, pageHeight]);

            // Embed image
            let embeddedImage;
            const imageBytes = await fetch(imgData).then(res => res.arrayBuffer());
            
            if (file.type === 'image/png') {
                embeddedImage = await finalPdf.embedPng(imageBytes);
            } else {
                embeddedImage = await finalPdf.embedJpg(imageBytes);
            }

            // Calculate scaling to fit image on page while maintaining aspect ratio
            const margin = 28.35; // 10mm margin in points
            const maxWidth = pageWidth - (margin * 2);
            const maxHeight = pageHeight - (margin * 2);

            let imgWidth = embeddedImage.width;
            let imgHeight = embeddedImage.height;
            const aspectRatio = imgWidth / imgHeight;

            if (imgWidth > imgHeight) {
                imgWidth = maxWidth;
                imgHeight = imgWidth / aspectRatio;
            } else {
                imgHeight = maxHeight;
                imgWidth = imgHeight * aspectRatio;
            }

            // Further scale down if still too large
            if (imgWidth > maxWidth) {
                imgWidth = maxWidth;
                imgHeight = imgWidth / aspectRatio;
            }
            if (imgHeight > maxHeight) {
                imgHeight = maxHeight;
                imgWidth = imgHeight * aspectRatio;
            }

            // Center image on page
            const x = (pageWidth - imgWidth) / 2;
            const y = (pageHeight - imgHeight) / 2;

            page.drawImage(embeddedImage, {
                x: x,
                y: y,
                width: imgWidth,
                height: imgHeight,
            });
        }
    }

    // Save the combined PDF
    const pdfBytes = await finalPdf.save({
        useObjectStreams: true,
        addDefaultPage: false
    });

    return new File([pdfBytes], `${taNumber}.pdf`, {
        type: 'application/pdf',
        lastModified: Date.now()
    });
};

// Validate and process files (PDF and/or images combined)
window.validateAndProcessFiles = async (fileInput, taNumber) => {
    const files = Array.from(fileInput.files);
    
    if (files.length === 0) {
        throw new Error('No file selected');
    }

    // Validate: max 10 total files (PDFs + images combined)
    if (files.length > 10) {
        throw new Error('Maximum 10 files allowed (PDFs and images combined)');
    }

    // Check file types
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const invalidFiles = files.filter(f => !validTypes.includes(f.type));
    
    if (invalidFiles.length > 0) {
        throw new Error('Only PDF, JPEG, and PNG files are supported');
    }

    // Combine all files (PDFs and images) into one PDF
    return await combineFilesToPDF(files, taNumber);
};

// ============================================
// UPLOAD PANEL INITIALIZATION
// ============================================

// Upload panel initialization and management
window.initUploadPanel = function(supabase, selectedEmployees, employeesMultiSelect) {
    const uploadStatus = document.getElementById("upload-status");
    const taNumberInput = document.getElementById("ta-number");
    const purposeInput = document.getElementById("purpose");
    const destinationInput = document.getElementById("destination");
    const travelDateInput = document.getElementById("travel-date");
    const travelUntilInput = document.getElementById("travel-until");
    const scanFileInput = document.getElementById("scan-file");

    // Use validation functions from global scope (defined in admin.html)
    const isValidTaNumber = window.isValidTaNumber;
    const bindTaFormatter = window.bindTaFormatter;

    // Initialize date pickers
    window.flatpickr(travelDateInput, {
        dateFormat: "Y-m-d",
        allowInput: true,
        disableMobile: true,
        static: false,
        monthSelectorType: 'static',
        position: 'auto center'
    });

    window.flatpickr(travelUntilInput, {
        dateFormat: "Y-m-d",
        allowInput: true,
        disableMobile: true,
        static: false,
        monthSelectorType: 'static',
        position: 'auto center'
    });

    // Bind TA number formatter
    bindTaFormatter(taNumberInput);

    // File input change handler
    scanFileInput.addEventListener("change", () => {
        if (scanFileInput.files.length > 0) {
            const fileCount = scanFileInput.files.length;
            const hasPdf = Array.from(scanFileInput.files).some(f => f.type === 'application/pdf');
            const hasImages = Array.from(scanFileInput.files).some(f => f.type.startsWith('image/'));
            
            if (fileCount === 1) {
                uploadStatus.textContent = `Selected: ${scanFileInput.files[0].name}`;
            } else {
                const fileTypes = [];
                if (hasPdf) fileTypes.push('PDF');
                if (hasImages) fileTypes.push('images');
                uploadStatus.textContent = `Selected: ${fileCount} files (${fileTypes.join(' + ')}) - will be combined into one PDF`;
            }
            
            // Show warning if too many files
            if (fileCount > 10) {
                uploadStatus.textContent = "⚠️ Maximum 10 files allowed";
                uploadStatus.classList.add("status--error");
            } else {
                uploadStatus.classList.remove("status--error");
            }
        } else {
            uploadStatus.textContent = "Complete the required fields.";
        }
    });

    // Real-time TA number validation for upload
    let taCheckTimer = null;
    taNumberInput.addEventListener("input", async () => {
        const taNumber = taNumberInput.value.trim();
        
        // Clear existing timer
        if (taCheckTimer) {
            clearTimeout(taCheckTimer);
        }
        
        // Only check if TA number is valid (matches pattern)
        if (isValidTaNumber(taNumber)) {
            // Debounce the database check by 500ms
            taCheckTimer = setTimeout(async () => {
                try {
                    const { data, error } = await supabase
                        .from("travel_authorities")
                        .select("ta_number")
                        .eq("ta_number", taNumber)
                        .maybeSingle();
                    
                    if (error && error.code !== 'PGRST116') {
                        // PGRST116 is "no rows returned" - that's expected if TA doesn't exist
                        console.error("Error checking TA number:", error);
                        return;
                    }
                    
                    if (data) {
                        // TA number already exists
                        if (window.showToast) {
                            window.showToast(`TA ${taNumber} already exists in the database.`, "warning");
                        }
                    }
                } catch (err) {
                    console.error("Error checking TA number:", err);
                }
            }, 500);
        }
    });

    // Upload button handler
    document.getElementById("upload-btn").addEventListener("click", async () => {
        const taNumber = taNumberInput.value.trim();
        const purpose = purposeInput.value.trim();
        const destination = destinationInput.value.trim();
        const travelDate = travelDateInput.value;
        let travelUntil = travelUntilInput.value;
        const employees = selectedEmployees.join(", ");

        if (!taNumber || !purpose || !destination || !travelDate || scanFileInput.files.length === 0 || selectedEmployees.length === 0) {
            uploadStatus.textContent = "Please fill in all required fields.";
            uploadStatus.classList.add("status--error");
            uploadStatus.classList.remove("status--shake");
            void uploadStatus.offsetWidth;
            uploadStatus.classList.add("status--shake");
            return;
        }

        if (!isValidTaNumber(taNumber)) {
            uploadStatus.textContent = "TA Number must be in the format 0000-00-0000.";
            uploadStatus.classList.add("status--error");
            uploadStatus.classList.remove("status--shake");
            void uploadStatus.offsetWidth;
            uploadStatus.classList.add("status--shake");
            return;
        }

        if (!travelUntil) {
            travelUntil = travelDate;
            travelUntilInput.value = travelDate;
        }

        if (travelUntil) {
            const start = new Date(`${travelDate}T00:00:00`);
            const end = new Date(`${travelUntil}T00:00:00`);
            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
                uploadStatus.textContent = "Please enter valid dates.";
                uploadStatus.classList.add("status--error");
                uploadStatus.classList.remove("status--shake");
                void uploadStatus.offsetWidth;
                uploadStatus.classList.add("status--shake");
                return;
            }

            if (start > end) {
                uploadStatus.textContent = "Travel date cannot be after travel end.";
                uploadStatus.classList.add("status--error");
                uploadStatus.classList.remove("status--shake");
                void uploadStatus.offsetWidth;
                uploadStatus.classList.add("status--shake");
                return;
            }
        }

        try {
            // Validate and process files (PDF or images)
            uploadStatus.textContent = 'Processing files...';
            uploadStatus.classList.remove("status--error");

            const processedFile = await window.validateAndProcessFiles(scanFileInput, taNumber);
            const processedSizeMB = (processedFile.size / 1024 / 1024).toFixed(2);
            
            // Check if file is still too large
            const maxAllowedMB = 10;
            if (processedFile.size > maxAllowedMB * 1024 * 1024) {
                uploadStatus.textContent = `File too large: ${processedSizeMB}MB (max ${maxAllowedMB}MB). Please use smaller files.`;
                uploadStatus.classList.add("status--error");
                uploadStatus.classList.remove("status--shake");
                void uploadStatus.offsetWidth;
                uploadStatus.classList.add("status--shake");
                return;
            }

            uploadStatus.textContent = `Uploading ${processedSizeMB}MB...`;

            // Verify user is authenticated
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !sessionData?.session) {
                throw new Error("No active session. Please log in again.");
            }

            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                throw new Error("Not authenticated");
            }

            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("id, role")
                .eq("id", user.id)
                .maybeSingle();

            // Allow both admin AND super users to upload
            if (profileError || (profile?.role !== "admin" && profile?.role !== "super")) {
                throw new Error("Not authorized to upload.");
            }

            const safeTa = taNumber.replace(/[^a-z0-9-_]/gi, "_");
            const safeDate = travelDate.replace(/[^0-9-]/g, "-");
            
            // Extract file extension and rename file to TA number with timestamp
            const fileExtension = processedFile.name.substring(processedFile.name.lastIndexOf('.'));
            const timestamp = Date.now();
            const newFileName = `${taNumber}_${timestamp}${fileExtension}`;
            const filePath = `travel-authorities/${safeTa}/${safeDate}/${newFileName}`;

            const { error: uploadError } = await supabase
                .storage
                .from("ta-files")
                .upload(filePath, processedFile, { upsert: false });

            if (uploadError) {
                throw new Error(`Storage upload failed: ${uploadError.message || "Unknown error"}`);
            }

            const { data: publicUrlData } = supabase
                .storage
                .from("ta-files")
                .getPublicUrl(filePath);

            const fileUrl = publicUrlData.publicUrl;

            // Use minimal returning: some RLS setups allow INSERT but prevent RETURNING rows.
            const { error: insertError } = await supabase
                .from("travel_authorities")
                .insert(
                    [
                        {
                            ta_number: taNumber,
                            purpose: purpose,
                            destination: destination,
                            employees: employees,
                            travel_date: travelDate,
                            travel_until: travelUntil,
                            file_name: newFileName,
                            file_url: fileUrl
                        }
                    ],
                    { returning: "minimal" }
                );

            if (insertError) {
                console.debug("[upload] insertError:", insertError);

                const errMsg = insertError.message || "";

                // If RETURNING is blocked by RLS
                if (errMsg.includes("no rows were returned after insert")) {
                    console.warn("[upload] INSERT returned no rows — likely RETURNING blocked by RLS. Attempting verification (best-effort).");
                    try {
                        const { data: verifyData, error: verifyError } = await supabase
                            .from("travel_authorities")
                            .select("ta_number")
                            .eq("ta_number", taNumber)
                            .maybeSingle();

                        console.debug("[upload] verification result:", { verifyData, verifyError });

                        if (verifyError) {
                            console.warn("[upload] verification SELECT failed (probably SELECT policy prevents reading):", verifyError);
                        } else if (verifyData) {
                            console.info("[upload] verification SELECT found the inserted row.");
                        } else {
                            console.warn("[upload] verification SELECT returned no row — this may be due to a restrictive SELECT policy.");
                        }
                    } catch (verifyErr) {
                        console.error("[upload] verification query threw:", verifyErr);
                    }

                    // UX fallback: treat as success
                    uploadStatus.textContent = "Upload complete (RETURNING blocked by RLS).";

                    if (typeof window.loadTravelAuthorities === "function") {
                        await window.loadTravelAuthorities(true);
                    }

                    const autoClearCheckbox = document.getElementById("auto-clear-checkbox");
                    if (autoClearCheckbox && autoClearCheckbox.checked) {
                        taNumberInput.value = "";
                        purposeInput.value = "";
                        destinationInput.value = "";
                        travelDateInput.value = "";
                        travelUntilInput.value = "";
                        scanFileInput.value = "";
                        selectedEmployees.length = 0;
                        employeesMultiSelect.updateDisplay();
                        employeesMultiSelect.renderOptions();
                        uploadStatus.textContent = "Upload complete. Fields cleared.";
                    }

                    console.warn("[upload] NOTE: update the SELECT RLS policy for `travel_authorities` if you need INSERT ... RETURNING to return rows to the client.");
                    return;
                }

                // Non-RETURNING-related failures: cleanup and surface the error
                try {
                    const { error: removeError } = await supabase.storage.from("ta-files").remove([filePath]);
                    if (removeError) console.warn("Cleanup: failed to remove uploaded file after DB error:", removeError);
                } catch (cleanupErr) {
                    console.warn("Cleanup: unexpected error while removing uploaded file:", cleanupErr);
                }

                if (insertError.code === '23505' || insertError.message?.includes('duplicate key') || insertError.message?.includes('unique constraint')) {
                    throw new Error(`TA Number ${taNumber} already exists in the database.`);
                }

                console.error("Database insert error (travel_authorities):", insertError);
                throw new Error(`Database insert failed: ${insertError.message || "Unknown error"}`);
            }

            uploadStatus.textContent = "Upload complete.";
            
            // Clear fields if auto-clear is enabled
            const autoClearCheckbox = document.getElementById("auto-clear-checkbox");
            if (autoClearCheckbox && autoClearCheckbox.checked) {
                taNumberInput.value = "";
                purposeInput.value = "";
                destinationInput.value = "";
                travelDateInput.value = "";
                travelUntilInput.value = "";
                scanFileInput.value = "";
                selectedEmployees.length = 0;
                employeesMultiSelect.updateDisplay();
                employeesMultiSelect.renderOptions();
                uploadStatus.textContent = "Upload complete. Fields cleared.";
            }

            // Reload travel authorities if function exists
            if (typeof window.loadTravelAuthorities === "function") {
                await window.loadTravelAuthorities(true);
            }
        } catch (error) {
            console.error("Upload error:", error);
            const message = error && error.message ? error.message : "Please try again.";
            uploadStatus.textContent = `Upload failed: ${message}`;
            uploadStatus.classList.add("status--error");
            uploadStatus.classList.remove("status--shake");
            void uploadStatus.offsetWidth;
            uploadStatus.classList.add("status--shake");
        }
    });

    // Clear upload fields button
    document.getElementById("clear-upload-btn").addEventListener("click", () => {
        taNumberInput.value = "";
        purposeInput.value = "";
        destinationInput.value = "";
        travelDateInput.value = "";
        travelUntilInput.value = "";
        scanFileInput.value = "";
        selectedEmployees.length = 0;
        employeesMultiSelect.updateDisplay();
        employeesMultiSelect.renderOptions();
        uploadStatus.textContent = "Fields cleared.";
        uploadStatus.classList.remove("status--error");
    });

    console.log("Upload panel initialized");
};
