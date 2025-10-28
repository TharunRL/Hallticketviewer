// src/HallTicket.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://hallticket-backend.graywave-4f251e45.centralindia.azurecontainerapps.io/api';

const HallTicket = () => {
    const [studentData, setStudentData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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
        <div className="container mx-auto p-4 md:p-8 font-sans">
            <header className="text-center mb-8 p-6 bg-white rounded-lg shadow-md">
                <h1 className="text-4xl font-bold text-gray-800">Examination Hall Ticket</h1>
                <p className="text-lg text-gray-500">Rajalakshmi Engineering College</p>
            </header>
            
            <div className="bg-white p-6 rounded-lg shadow-md mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><span className="font-semibold">Name:</span> {studentDetails.name}</div>
                <div><span className="font-semibold">Roll No:</span> {studentDetails.roll_no}</div>
                <div><span className="font-semibold">Class:</span> {studentDetails.student_class}</div>
            </div>

            {examinations.map(exam => (
                <div key={exam.exam_id} className="mb-8 bg-white rounded-lg shadow-md overflow-hidden">
                    <h2 className="text-2xl font-semibold text-white bg-indigo-600 p-4">{exam.exam_name}</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            {/* ... table header ... */}
                            <tbody className="divide-y divide-gray-200">
                                {exam.subjects.map(subject => (
                                    <tr key={subject.subject_code}>
                                        <td className="px-6 py-4 whitespace-nowrap">{subject.subject_code}</td>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium">{subject.subject_name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{new Date(subject.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{subject.time}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{subject.hall || 'TBA'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap font-bold">{subject.seat || 'TBA'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
             <div className="text-center mt-8 print:hidden">
                <button onClick={() => window.print()} className="bg-gray-700 text-white py-2 px-6 rounded-lg hover:bg-gray-800">
                    Print Hall Ticket
                </button>
            </div>
        </div>
    );
};

export default HallTicket;