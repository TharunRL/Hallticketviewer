// src/HallTicket.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://hallticket-backend.graywave-4f251e45.centralindia.azurecontainerapps.io/api';

const HallTicket = () => {
    const [studentData, setStudentData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedExam, setExpandedExam] = useState(null);

    useEffect(() => {
        const getStudentIdFromUrl = () => {
            const params = new URLSearchParams(window.location.search);
            return params.get('RegisterNo');
        };

        const fetchHallTicket = async () => {
            const studentId = getStudentIdFromUrl();
            if (!studentId) {
                setError('Student Register Number not found in URL.');
                setLoading(false);
                return;
            }

            try {
                const response = await axios.get(`${API_BASE_URL}/hallticket/${studentId}`);
                setStudentData(response.data);
            } catch (err) {
                setError(err.response?.data?.message || 'Could not fetch hall ticket.');
            } finally {
                setLoading(false);
            }
        };

        fetchHallTicket();
    }, []);

    const toggleExam = (examId) => {
        setExpandedExam(expandedExam === examId ? null : examId);
    };

    const printExam = (exam) => {
        const printWindow = window.open('', '', 'width=800,height=600');
        const { studentDetails } = studentData;
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Hall Ticket - ${exam.exam_name}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                    .header h1 { margin: 0; font-size: 28px; }
                    .header p { margin: 5px 0; color: #666; }
                    .student-info { margin-bottom: 30px; background: #f5f5f5; padding: 15px; border-radius: 5px; }
                    .student-info div { margin: 8px 0; }
                    .student-info strong { display: inline-block; width: 120px; }
                    .exam-title { background: #4F46E5; color: white; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                    th { background-color: #f8f9fa; font-weight: bold; }
                    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Examination Hall Ticket</h1>
                    <p>Rajalakshmi Engineering College</p>
                </div>
                <div class="student-info">
                    <div><strong>Name:</strong> ${studentDetails.name}</div>
                    <div><strong>Roll No:</strong> ${studentDetails.roll_no}</div>
                    <div><strong>Class:</strong> ${studentDetails.student_class}</div>
                </div>
                <div class="exam-title">
                    <h2 style="margin: 0;">${exam.exam_name}</h2>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Subject Code</th>
                            <th>Subject Name</th>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Hall</th>
                            <th>Seat No</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${exam.subjects.map(subject => `
                            <tr>
                                <td>${subject.subject_code}</td>
                                <td>${subject.subject_name}</td>
                                <td>${new Date(subject.date).toLocaleDateString()}</td>
                                <td>${subject.time}</td>
                                <td>${subject.hall || 'TBA'}</td>
                                <td><strong>${subject.seat || 'TBA'}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="footer">
                    <p>Please bring this hall ticket to the examination hall. Entry will not be permitted without it.</p>
                    <p>Report to the examination hall at least 15 minutes before the scheduled start time.</p>
                </div>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    if (loading) {
        return <div className="text-center p-10 font-sans">Loading Hall Ticket...</div>;
    }

    if (error) {
        return <div className="text-center p-10 text-red-600 font-bold font-sans">{error}</div>;
    }

    if (!studentData) {
        return null;
    }
    
    const { studentDetails, examinations } = studentData;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8 font-sans">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <header className="text-center mb-8 p-8 bg-white rounded-xl shadow-lg">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">Hall Ticket</h1>
                    <p className="text-lg text-gray-600">Rajalakshmi Engineering College</p>
            </header>
            
                {/* Student Info Card */}
                <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2">Student Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex flex-col">
                            <span className="text-sm text-gray-500 mb-1">Name</span>
                            <span className="font-semibold text-gray-800">{studentDetails.name}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm text-gray-500 mb-1">Roll Number</span>
                            <span className="font-semibold text-gray-800">{studentDetails.roll_no}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm text-gray-500 mb-1">Class</span>
                            <span className="font-semibold text-gray-800">{studentDetails.student_class}</span>
                        </div>
                    </div>
                </div>

                {/* Examinations Section */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Examinations</h2>
                    <p className="text-gray-600 mb-6">Click on an examination to view details and print hall ticket</p>
                </div>

                {/* Exam Cards */}
                <div className="space-y-4">
                    {examinations.map(exam => {
                        const isExpanded = expandedExam === exam.exam_id;
                        return (
                            <div key={exam.exam_id} className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300">
                                {/* Exam Header - Clickable */}
                                <div 
                                    onClick={() => toggleExam(exam.exam_id)}
                                    className="cursor-pointer bg-gradient-to-r from-indigo-600 to-purple-600 p-6 flex justify-between items-center hover:from-indigo-700 hover:to-purple-700 transition-all"
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-white">{exam.exam_name}</h3>
                                            <p className="text-indigo-100 text-sm mt-1">{exam.subjects.length} subject{exam.subjects.length !== 1 ? 's' : ''}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                printExam(exam);
                                            }}
                                            className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-semibold hover:bg-indigo-50 transition-all flex items-center space-x-2 shadow-md"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                            </svg>
                                            <span>Print</span>
                                        </button>
                                        <svg 
                                            className={`w-6 h-6 text-white transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
                                            fill="none" 
                                            stroke="currentColor" 
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
            </div>

                                {/* Exam Details - Expandable */}
                                <div className={`transition-all duration-300 ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                                    <div className="p-6">
                    <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject Code</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject Name</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hall</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seat No</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {exam.subjects.map((subject, idx) => (
                                                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{subject.subject_code}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{subject.subject_name}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{new Date(subject.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{subject.time}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">{subject.hall || 'TBA'}</span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold">{subject.seat || 'TBA'}</span>
                                                            </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Note */}
                <div className="mt-8 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                                <strong>Important:</strong> Please bring your printed hall ticket to the examination hall. Report at least 15 minutes before the scheduled start time.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HallTicket;