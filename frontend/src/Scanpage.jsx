import React, { useEffect, useRef } from 'react';
// Import the full library, not just the scanner, for file-based scanning
import { Html5Qrcode, Html5QrcodeScanType } from 'html5-qrcode';

const Scanpage = () => {
    // useRef to hold a reference to the file input element
    const fileInputRef = useRef(null);

    // This function remains the core logic for what to do after a successful scan
    const onScanSuccess = (decodedText) => {
        console.log(`Scan result: ${decodedText}`);
        
        try {
            const url = new URL(decodedText);
            const registerNo = url.searchParams.get("RegisterNo");
            if (registerNo) {
                // Redirect to the hall ticket page
                window.location.pathname = `/hallticket`;
                window.location.search = `?RegisterNo=${registerNo}`;
            } else {
                alert("Error: QR Code does not contain a Register Number.");
            }
        } catch (error) {
            alert("Error: Invalid QR Code format. Not a valid URL.");
        }
    };

    // --- Effect for Live Camera Scanning ---
    useEffect(() => {
        // This configures the camera scanner
        const config = {
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
                const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                return { width: minEdge * 0.7, height: minEdge * 0.7 };
            },
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
        };
        
        const scanner = new Html5Qrcode('qr-reader');

        const successCallback = (decodedText, decodedResult) => {
            // Stop scanning after a successful scan
            scanner.stop()
                .then(() => onScanSuccess(decodedText))
                .catch(err => console.error("Failed to stop scanner", err));
        };
        
        const errorCallback = (error) => {
            // Errors are ignored to allow continuous scanning
        };

        // Start scanning
        scanner.start({ facingMode: "environment" }, config, successCallback, errorCallback)
            .catch(err => {
                 // Don't log "camera not found" as an error on desktops
                if (err.name !== "NotAllowedError" && err.name !== "NotFoundError") {
                    console.error("Unable to start scanner", err);
                }
            });

        // Cleanup function to stop the camera when the component unmounts
        return () => {
            // Check if the scanner has a 'getState' method and is not 'NOT_STARTED'
            if (scanner && scanner.getState() && scanner.getState() !== 1) { // 1 is Html5QrcodeScannerState.NOT_STARTED
                 scanner.stop().catch(error => {
                    console.error("Failed to stop the scanner on unmount.", error);
                });
            }
        };
    }, []); // Empty array ensures this effect runs only once

    // --- Handler for File Upload ---
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const fileScanner = new Html5Qrcode(/* verbose= */ false);

        try {
            const decodedText = await fileScanner.scanFile(file, /* showImage= */ false);
            onScanSuccess(decodedText);
        } catch (err) {
            alert(`Error scanning file: ${err.name === 'NotFoundException' ? 'No QR code found in the image.' : err.message}`);
        }
    };
    
    // Triggers the hidden file input
    const handleUploadClick = () => {
        fileInputRef.current.click();
    };

    // --- NEW STYLING ---
    return (
        <div className="bg-gray-900 flex flex-col items-center justify-center min-h-screen text-white font-sans p-4">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-100">Invigilator Scanner</h1>
                <p className="text-gray-400">Position the QR code inside the frame</p>
            </div>

            {/* --- Live Camera Scanner View with Targeting Frame --- */}
            <div className="w-full max-w-sm aspect-square relative mb-6">
                {/* Corner Brackets */}
                <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-cyan-400 rounded-br-lg"></div>
                
                {/* Scan Line Animation */}
                <div className="absolute inset-4 overflow-hidden rounded-lg">
                    <div className="scan-line"></div>
                </div>

                {/* QR Code Reader Viewfinder */}
                <div id="qr-reader" className="w-full h-full"></div>
            </div>

            {/* --- Divider --- */}
            <div className="relative flex py-2 items-center w-full max-w-sm">
                <div className="flex-grow border-t border-gray-600"></div>
                <span className="flex-shrink mx-4 text-gray-500 font-semibold">OR</span>
                <div className="flex-grow border-t border-gray-600"></div>
            </div>

            {/* --- Hidden File Input for Image Upload --- */}
            <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden" 
            />

            {/* --- Custom Upload Button --- */}
            <div className="w-full max-w-sm mt-2">
                 <button
                    onClick={handleUploadClick}
                    className="w-full bg-transparent border-2 border-cyan-500 text-cyan-400 font-bold py-3 px-4 rounded-lg hover:bg-cyan-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500 transition-colors duration-300"
                >
                    Upload from File
                </button>
            </div>
        </div>
    );
};

export default Scanpage;