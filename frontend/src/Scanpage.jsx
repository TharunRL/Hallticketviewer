import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScanType } from 'html5-qrcode';

const Scanpage = () => {
    const fileInputRef = useRef(null);
    const html5QrcodeScannerRef = useRef(null);
    const [cameraStatus, setCameraStatus] = useState('initializing'); // 'initializing', 'active', 'denied', 'error'

    // Core logic for handling a successful scan
    const onScanSuccess = (decodedText) => {
        console.log(`Scan result: ${decodedText}`);
        
        try {
            const url = new URL(decodedText);
            const registerNo = url.searchParams.get("RegisterNo");
            if (registerNo) {
                // Redirect reliably in a single step
                window.location.href = `/hallticket?RegisterNo=${registerNo}`;
            } else {
                alert("Error: QR Code does not contain a Register Number.");
            }
        } catch (error) {
            alert("Error: Invalid QR Code format. Not a valid URL.");
        }
    };

    // Effect for initializing and running the live camera scanner
    useEffect(() => {
        html5QrcodeScannerRef.current = new Html5Qrcode('qr-reader');
        const scanner = html5QrcodeScannerRef.current;

        const config = {
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
                const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                return { width: minEdge * 0.7, height: minEdge * 0.7 };
            },
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
        };
        
        const successCallback = (decodedText, decodedResult) => {
            scanner.stop()
                .then(() => onScanSuccess(decodedText))
                .catch(err => console.error("Failed to stop scanner", err));
        };
        
        const errorCallback = (error) => {
            // Errors are ignored to allow continuous scanning
        };

        scanner.start({ facingMode: "environment" }, config, successCallback, errorCallback)
            .then(() => {
                console.log("Camera scanner started successfully");
                setCameraStatus('active');
            })
            .catch(err => {
                console.error("Unable to start scanner", err);
                if (err.name === "NotAllowedError") {
                    setCameraStatus('denied');
                    alert("Camera access denied. Please allow camera access in your browser settings and refresh the page.");
                } else if (err.name === "NotFoundError") {
                    setCameraStatus('error');
                    alert("No camera found on your device. You can still use the 'Upload from File' option below.");
                } else {
                    setCameraStatus('error');
                    alert("Unable to start camera: " + (err.message || "Unknown error"));
                }
            });

        // Cleanup function to stop the camera when the component unmounts
        return () => {
            if (scanner && scanner.getState() && scanner.getState() !== 1) { // 1 is Html5QrcodeScannerState.NOT_STARTED
                 scanner.stop().catch(error => {
                    console.error("Failed to stop the scanner on unmount.", error);
                });
            }
        };
    }, []); // Empty dependency array ensures this runs only once on mount

    // Handler for the file upload input change
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file || !html5QrcodeScannerRef.current) return;

        const fileScanner = html5QrcodeScannerRef.current;

        try {
            // Scan the file
            const decodedText = await fileScanner.scanFile(file, /* showImage= */ false);
            
            // Stop the camera scanner before redirecting
            try { 
                await fileScanner.stop();
            } catch (stopErr) {
                console.error("Failed to stop scanner after file scan", stopErr);
            }
            
            onScanSuccess(decodedText);
        } catch (err) {
            const errorMessage = err.name === 'NotFoundException' 
                ? 'No QR code found in the image.' 
                : (err.message || 'Unknown error occurred while scanning.');
            alert(`Error scanning file: ${errorMessage}`);
        }
    };
    
    // Triggers the hidden file input
    const handleUploadClick = () => {
        fileInputRef.current.click();
    };

    // JSX for the component's UI
    return (
        <div className="bg-gray-900 flex flex-col items-center justify-center min-h-screen text-white font-sans p-4">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-100">Invigilator Scanner</h1>
                <p className="text-gray-400">Position the QR code inside the frame</p>
                {cameraStatus === 'initializing' && (
                    <p className="text-yellow-400 text-sm mt-2">🔄 Requesting camera access...</p>
                )}
                {cameraStatus === 'active' && (
                    <p className="text-green-400 text-sm mt-2">✓ Camera active</p>
                )}
                {cameraStatus === 'denied' && (
                    <p className="text-red-400 text-sm mt-2">✗ Camera access denied</p>
                )}
                {cameraStatus === 'error' && (
                    <p className="text-orange-400 text-sm mt-2">⚠ Camera unavailable - use file upload</p>
                )}
            </div>

            {/* --- Live Camera Scanner View with Targeting Frame --- */}
            <div className="w-full max-w-sm aspect-square relative mb-6">
                <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-cyan-400 rounded-br-lg"></div>
                
                <div className="absolute inset-4 overflow-hidden rounded-lg">
                    <div className="scan-line"></div>
                </div>

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