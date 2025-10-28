import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';

// --- Configuration ---
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://hallticket-backend.graywave-4f251e45.centralindia.azurecontainerapps.io/api';

// --- ICONS ---
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const ExamIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
const StudentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197m0 0A5.975 5.975 0 0112 13a5.975 5.975 0 016-5.197M15 21a6 6 0 00-9-5.197" /></svg>;
const WandIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v1.046a1 1 0 01-1.293.954l-1.012-.39a1 1 0 01-.69-1.454l.293-.754a1 1 0 011.002-.456zM4.343 4.343a1 1 0 011.414 0l.707.707a1 1 0 01-1.414 1.414l-.707-.707a1 1 0 010-1.414zm11.314 0a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM1 11.5a1 1 0 011-1h1.046a1 1 0 01.954 1.293l-.39 1.012a1 1 0 01-1.454.69l-.754-.293a1 1 0 01-.456-1.002zm17.046 0a1 1 0 01-.456 1.002l-.754.293a1 1 0 01-1.454-.69l-.39-1.012a1 1 0 01.954-1.293H18a1 1 0 011 1zM8.7 18.954a1 1 0 01-1.002.456l-.293-.754a1 1 0 011.454-.69l1.012.39a1 1 0 01-.21 1.602v-.001zM11.3 18.954a1 1 0 01.21-1.602l1.012-.39a1 1 0 011.454.69l.293.754a1 1 0 01-1.002.456v.001a1 1 0 01-1.21-.001l-.744-.288zM4.343 15.657a1 1 0 011.414-1.414l.707.707a1 1 0 01-1.414 1.414l-.707-.707zm11.314 0a1 1 0 01-1.414 1.414l-.707-.707a1 1 0 011.414-1.414l.707.707zM10 5a5 5 0 100 10 5 5 0 000-10z" clipRule="evenodd" /></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>;


// --- HELPER COMPONENTS ---
const Notification = ({ message, type, onDismiss }) => {
    if (!message) return null;
    const typeClasses = { success: "bg-green-500", error: "bg-red-500", info: "bg-blue-500" };
    return (
        <div className={`fixed top-5 right-5 p-4 rounded-lg shadow-lg text-white z-50 ${typeClasses[type] || 'bg-gray-700'}`}>
            <span>{message}</span><button onClick={onDismiss} className="ml-4 font-bold">X</button>
        </div>
    );
};
const Card = ({ title, children }) => (
    <div className="bg-white p-6 rounded-xl shadow-md"><h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">{title}</h2>{children}</div>
);
const StatCard = ({ title, value, icon }) => (
    <div className="bg-white p-5 rounded-xl shadow flex items-center">
        <div className="bg-indigo-100 text-indigo-600 p-3 rounded-full mr-4">{icon}</div>
        <div><p className="text-gray-500 text-sm font-medium">{title}</p><p className="text-2xl font-bold text-gray-800">{value}</p></div>
    </div>
);
const Input = ({ label, ...props }) => (
    <div><label className="block text-sm font-medium text-gray-700 mb-1">{label}</label><input className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" {...props} /></div>
);
const Select = ({ label, children, ...props }) => (
    <div><label className="block text-sm font-medium text-gray-700 mb-1">{label}</label><select className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" {...props}>{children}</select></div>
);
const Button = ({ children, isLoading = false, ...props }) => (
    <button className="w-full flex justify-center items-center bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-indigo-300" disabled={isLoading} {...props}>
        {isLoading ? 'Processing...' : children}
    </button>
);


// --- FORM COMPONENTS ---
const ExaminationForm = ({ onUpdate }) => {
    const [formData, setFormData] = useState({ exam_name: '', start_date: '', end_date: '' });
    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE_URL}/examinations`, formData);
            onUpdate('success', 'Examination created!');
            setFormData({ exam_name: '', start_date: '', end_date: '' });
        } catch (error) { onUpdate('error', 'Failed to create examination.'); }
    };
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Examination Name" name="exam_name" value={formData.exam_name} onChange={handleChange} required />
            <Input label="Start Date" name="start_date" type="date" value={formData.start_date} onChange={handleChange} required />
            <Input label="End Date" name="end_date" type="date" value={formData.end_date} onChange={handleChange} required />
            <Button type="submit">Create Examination</Button>
        </form>
    );
};

const ScheduleForm = ({ examinations, subjects, onUpdate }) => {
    const [formData, setFormData] = useState({ exam_id: '', subject_id: '', exam_date: '', start_time: '' });
    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE_URL}/exam-schedule`, formData);
            onUpdate('success', 'Schedule created!');
            setFormData({ exam_id: '', subject_id: '', exam_date: '', start_time: '' });
        } catch (error) { onUpdate('error', 'Failed to create schedule.'); }
    };
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Select label="Examination" name="exam_id" value={formData.exam_id} onChange={handleChange} required>
                <option value="">Select Examination</option>{examinations.map(ex => <option key={ex.exam_id} value={ex.exam_id}>{ex.exam_name}</option>)}
            </Select>
            <Select label="Subject" name="subject_id" value={formData.subject_id} onChange={handleChange} required>
                <option value="">Select Subject</option>{subjects.map(sub => <option key={sub.subject_id} value={sub.subject_id}>{sub.subject_name}</option>)}
            </Select>
            <Input label="Exam Date" name="exam_date" type="date" value={formData.exam_date} onChange={handleChange} required />
            <Input label="Start Time" name="start_time" type="time" value={formData.start_time} onChange={handleChange} required />
            <Button type="submit">Create Schedule</Button>
        </form>
    );
};

const StudentRegistrationForm = ({ schedules, students, allocations, onUpdate }) => {
    const [scheduleId, setScheduleId] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedStudents, setSelectedStudents] = useState(new Set());

    const uniqueClasses = useMemo(() => {
        return [...new Set(students.map(s => s.student_class))].sort();
    }, [students]);

    const visibleStudents = useMemo(() => {
        if (!scheduleId) return [];
        
        const registeredStudentIds = new Set(
            allocations
                .filter(a => a.schedule_id === parseInt(scheduleId))
                .map(a => a.student_id)
        );

        return students.filter(student => {
            if (registeredStudentIds.has(student.student_id)) return false;
            if (selectedClass && student.student_class !== selectedClass) return false;
            return true;
        });
    }, [scheduleId, selectedClass, students, allocations]);

    const handleStudentToggle = (studentId) => {
        setSelectedStudents(prev => {
            const newSet = new Set(prev);
            if (newSet.has(studentId)) newSet.delete(studentId);
            else newSet.add(studentId);
            return newSet;
        });
    };
    
    const handleSelectAll = () => {
        if (visibleStudents.length === selectedStudents.size) {
            setSelectedStudents(new Set());
        } else {
            setSelectedStudents(new Set(visibleStudents.map(s => s.student_id)));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedStudents.size === 0) return onUpdate('error', 'Please select at least one student.');
        try {
            await axios.post(`${API_BASE_URL}/register-students`, { 
                schedule_id: parseInt(scheduleId), 
                student_ids: Array.from(selectedStudents) 
            });
            onUpdate('success', `${selectedStudents.size} students registered!`);
            setSelectedStudents(new Set());
        } catch (error) { 
            onUpdate('error', error.response?.data?.message || 'Failed to register students.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select label="1. Select Schedule" value={scheduleId} onChange={e => { setScheduleId(e.target.value); setSelectedClass(''); setSelectedStudents(new Set()); }} required>
                    <option value="">Select a subject schedule</option>
                    {schedules.map(s => <option key={s.schedule_id} value={s.schedule_id}>{s.exam_name} - {s.subject_name} ({new Date(s.exam_date).toLocaleDateString()})</option>)}
                </Select>
                <Select label="2. Filter by Class (Optional)" value={selectedClass} onChange={e => setSelectedClass(e.target.value)} disabled={!scheduleId}>
                    <option value="">All Classes</option>
                    {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
            </div>

            <div className="border rounded-md p-2 h-60 overflow-y-auto">
                {scheduleId ? (
                    <>
                        <div className="p-2 border-b">
                            <button type="button" onClick={handleSelectAll} className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold">
                                {visibleStudents.length === selectedStudents.size && visibleStudents.length > 0 ? 'Deselect All' : 'Select All Visible'}
                            </button>
                        </div>
                        {visibleStudents.length > 0 ? visibleStudents.map(student => (
                            <div key={student.student_id} className="flex items-center p-1 hover:bg-gray-50">
                                <input type="checkbox" id={`student-${student.student_id}`} checked={selectedStudents.has(student.student_id)} onChange={() => handleStudentToggle(student.student_id)} className="h-4 w-4 rounded" />
                                <label htmlFor={`student-${student.student_id}`} className="ml-2 text-sm text-gray-700">{student.name} ({student.roll_no})</label>
                            </div>
                        )) : <p className="text-sm text-gray-500 p-2">No available students match your criteria.</p>}
                    </>
                ) : <p className="text-sm text-gray-500 p-2">Please select a schedule to see available students.</p>}
            </div>
            <Button type="submit">Register {selectedStudents.size > 0 ? selectedStudents.size : ''} Students</Button>
        </form>
    );
};

const AIAllocationAssistant = ({ schedules, onUpdate }) => {
    const [scheduleId, setScheduleId] = useState('');
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedPlan, setGeneratedPlan] = useState(null);

    const handleGeneratePlan = async (e) => {
        e.preventDefault();
        setIsLoading(true); setGeneratedPlan(null);
        try {
            const res = await axios.post(`${API_BASE_URL}/generate-allocation-plan`, { schedule_id: parseInt(scheduleId), prompt });
            setGeneratedPlan(res.data);
            onUpdate('info', 'AI plan generated. Review and execute.');
        } catch (error) { onUpdate('error', error.response?.data?.message || 'Failed to generate AI plan.'); }
        finally { setIsLoading(false); }
    };
    
    const handleExecutePlan = async () => {
        if (!generatedPlan) return;
        setIsLoading(true);
        try {
            await axios.post(`${API_BASE_URL}/execute-allocation-plan`, { plan: generatedPlan.plan, schedule_id: parseInt(scheduleId) });
            onUpdate('success', 'AI plan executed successfully!');
            setGeneratedPlan(null); setPrompt(''); setScheduleId('');
        } catch (error) { onUpdate('error', 'Failed to execute AI plan.'); }
        finally { setIsLoading(false); }
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleGeneratePlan} className="space-y-4">
                <Select label="Select Schedule to Allocate" value={scheduleId} onChange={e => setScheduleId(e.target.value)} required>
                    <option value="">Select a schedule</option>{schedules.map(s => <option key={s.schedule_id} value={s.schedule_id}>{s.exam_name} - {s.subject_name}</option>)}
                </Select>
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)} className="w-full p-2 border rounded-md" rows="3" placeholder="e.g., Allocate CSE students to Hall A. Keep at least one empty seat between students." required />
                <Button type="submit" isLoading={isLoading} disabled={isLoading || !scheduleId}><WandIcon/> Generate Plan</Button>
            </form>
            {generatedPlan && (
                <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
                    <h4 className="font-bold text-gray-800">Generated Plan Summary</h4>
                    <p className="text-sm text-gray-700 italic my-2"><strong>AI Reasoning:</strong> {generatedPlan.reasoning}</p>
                    <div className="max-h-40 overflow-y-auto bg-gray-900 text-white p-2 rounded text-xs font-mono"><pre>{JSON.stringify(generatedPlan.plan, null, 2)}</pre></div>
                    <Button onClick={handleExecutePlan} isLoading={isLoading} disabled={isLoading} className="mt-4">Looks Good, Execute Plan</Button>
                </div>
            )}
        </div>
    );
};

// --- MODAL COMPONENT ---
const AllocationModal = ({ allocation, halls, scheduleId, onClose, onUpdate }) => {
    const [selectedHallId, setSelectedHallId] = useState('');
    const [seatNumber, setSeatNumber] = useState('');
    const [occupiedSeats, setOccupiedSeats] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (selectedHallId) {
            axios.get(`${API_BASE_URL}/schedules/${scheduleId}/halls/${selectedHallId}/occupied-seats`)
                .then(response => setOccupiedSeats(response.data))
                .catch(err => console.error("Could not fetch occupied seats"));
        } else {
            setOccupiedSeats([]);
        }
    }, [selectedHallId, scheduleId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await axios.put(`${API_BASE_URL}/allocations/${allocation.allocation_id}`, {
                hall_id: parseInt(selectedHallId),
                seat_number: seatNumber
            });
            onUpdate('success', 'Seat allocated successfully!');
            onClose();
        } catch (error) {
            onUpdate('error', error.response?.data?.message || 'Failed to allocate seat.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">Allocate Seat</h2>
                <p className="mb-4">Allocating seat for: <span className="font-semibold">{allocation.student.name} ({allocation.student.roll_no})</span></p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Select label="Select Hall" value={selectedHallId} onChange={e => setSelectedHallId(e.target.value)} required>
                        <option value="">Choose a hall...</option>
                        {halls.map(h => <option key={h.hall_id} value={h.hall_id}>{h.hall_name} (Capacity: {h.capacity})</option>)}
                    </Select>
                    
                    {selectedHallId && (
                        <div>
                            <Input label="Seat Number" value={seatNumber} onChange={e => setSeatNumber(e.target.value.toUpperCase())} placeholder="e.g., A12" required />
                            <div className="mt-2 text-xs text-gray-500">
                                <span className="font-semibold">Taken Seats: </span>
                                {occupiedSeats.length > 0 ? occupiedSeats.join(', ') : 'None'}
                            </div>
                        </div>
                    )}
                    
                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300">Cancel</button>
                        <button type="submit" className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700" disabled={isLoading}>
                            {isLoading ? 'Saving...' : 'Save Allocation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- VIEW COMPONENTS ---
const DashboardView = ({ data, handleUpdate, enrichedSchedules }) => (
    <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard title="Total Students" value={data.students.length} icon={<StudentIcon />} />
            <StatCard title="Total Subjects" value={data.subjects.length} icon={<ExamIcon />} />
            <StatCard title="Active Exams" value={data.examinations.length} icon={<ExamIcon />} />
            <StatCard title="Exam Halls" value={data.exam_halls.length} icon={<HomeIcon />} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 flex flex-col gap-8">
                <Card title="Step 1: Create Examination"><ExaminationForm onUpdate={handleUpdate} /></Card>
                <Card title="Step 2: Create Exam Schedule"><ScheduleForm examinations={data.examinations} subjects={data.subjects} onUpdate={handleUpdate} /></Card>
            </div>
            <div className="lg:col-span-2 flex flex-col gap-8">
                <Card title="Step 3: Register Students for a Schedule"><StudentRegistrationForm schedules={enrichedSchedules} students={data.students} allocations={data.allocations} onUpdate={handleUpdate} /></Card>
                <Card title="Step 4: Allocate Halls & Seats"><AIAllocationAssistant schedules={enrichedSchedules} onUpdate={handleUpdate} /></Card>
            </div>
        </div>
    </>
);

const ExaminationsListView = ({ examinations, onSelectExam }) => (
    <Card title="All Examinations">
        <ul className="space-y-2">
            {examinations.map(exam => (
                <li key={exam.exam_id} onClick={() => onSelectExam(exam)} className="p-4 bg-gray-50 rounded-lg hover:bg-indigo-100 cursor-pointer transition-colors flex justify-between items-center">
                    <div>
                        <p className="font-semibold text-lg text-gray-800">{exam.exam_name}</p>
                        <p className="text-sm text-gray-500">{new Date(exam.start_date).toLocaleDateString()} - {new Date(exam.end_date).toLocaleDateString()}</p>
                    </div>
                    <ChevronRightIcon />
                </li>
            ))}
        </ul>
    </Card>
);

const ExamScheduleView = ({ selectedExam, schedules, onSelectSchedule }) => {
    const schedulesForExam = useMemo(() => schedules.filter(s => s.exam_id === selectedExam.exam_id), [schedules, selectedExam]);
    
    return (
        <Card title={`Schedules for ${selectedExam.exam_name}`}>
            {schedulesForExam.length > 0 ? (
                <ul className="space-y-2">
                    {schedulesForExam.map(schedule => (
                        <li key={schedule.schedule_id} onClick={() => onSelectSchedule(schedule)} className="p-4 bg-gray-50 rounded-lg hover:bg-indigo-100 cursor-pointer transition-colors flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-lg text-gray-800">{schedule.subject_name}</p>
                                <p className="text-sm text-gray-500">{new Date(schedule.exam_date).toLocaleDateString()} at {schedule.start_time}</p>
                            </div>
                            <ChevronRightIcon />
                        </li>
                    ))}
                </ul>
            ) : <p className="text-gray-500">No schedules have been created for this examination yet.</p>}
        </Card>
    );
};

const AllocationDetailView = ({ selectedSchedule, data, onUpdate }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAllocation, setSelectedAllocation] = useState(null);

    const allocationsForSchedule = useMemo(() => {
        return data.allocations
            .filter(a => a.schedule_id === selectedSchedule.schedule_id)
            .map(alloc => {
                const student = data.students.find(s => s.student_id === alloc.student_id);
                const hall = data.exam_halls.find(h => h.hall_id === alloc.hall_id);
                return { ...alloc, student, hall };
            });
    }, [data, selectedSchedule]);

    const handleRemoveStudent = async (allocationId) => {
        if (window.confirm('Are you sure you want to remove this student from the schedule?')) {
            try {
                await axios.delete(`${API_BASE_URL}/allocations/${allocationId}`);
                onUpdate('success', 'Student removed successfully.');
            } catch (error) {
                onUpdate('error', error.response?.data?.message || 'Failed to remove student.');
            }
        }
    };

    const openAllocationModal = (allocation) => {
        setSelectedAllocation(allocation);
        setIsModalOpen(true);
    };

    const AddStudentPanel = () => {
        const [studentId, setStudentId] = useState('');
        const availableStudents = useMemo(() => {
            const registeredIds = new Set(allocationsForSchedule.map(a => a.student_id));
            return data.students.filter(s => !registeredIds.has(s.student_id));
        }, [allocationsForSchedule, data.students]);
        const handleAddStudent = async (e) => {
            e.preventDefault();
            if (!studentId) return onUpdate('error', 'Please select a student to add.');
            try {
                await axios.post(`${API_BASE_URL}/register-students`, {
                    schedule_id: selectedSchedule.schedule_id,
                    student_ids: [studentId]
                });
                onUpdate('success', 'Student added to schedule.');
            } catch (error) {
                onUpdate('error', error.response?.data?.message || 'Failed to add student.');
            }
        };

        return (
            <div className="my-4 p-4 border rounded-lg bg-gray-50">
                <form onSubmit={handleAddStudent} className="flex items-end space-x-4">
                    <div className="flex-1">
                        <Select label="Select Student to Add" value={studentId} onChange={e => setStudentId(e.target.value)}>
                            <option value="">Choose a student...</option>
                            {availableStudents.map(s => <option key={s.student_id} value={s.student_id}>{s.name} ({s.roll_no})</option>)}
                        </Select>
                    </div>
                    <button type="submit" className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 h-10">Add Student</button>
                </form>
            </div>
        );
    };

    return (
        <>
            {isModalOpen && (
                <AllocationModal 
                    allocation={selectedAllocation} 
                    halls={data.exam_halls}
                    scheduleId={selectedSchedule.schedule_id}
                    onClose={() => setIsModalOpen(false)}
                    onUpdate={onUpdate}
                />
            )}
            <Card title={`Student Roster for ${selectedSchedule.subject_name}`}>
                <div className="mb-4"><AddStudentPanel /></div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll No</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status / Hall</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seat</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {allocationsForSchedule.map((alloc) => (
                                <tr key={alloc.allocation_id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{alloc.student?.roll_no}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{alloc.student?.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {alloc.hall ? <span className="font-bold text-green-600">{alloc.hall.hall_name}</span> : <span className="text-yellow-600">Registered</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{alloc.seat_number || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {alloc.hall ? (
                                            <span className="text-gray-400">Locked</span>
                                        ) : (
                                            <div className="flex space-x-4">
                                                <button onClick={() => openAllocationModal(alloc)} className="text-indigo-600 hover:text-indigo-800 font-medium">Allocate</button>
                                                <button onClick={() => handleRemoveStudent(alloc.allocation_id)} className="text-red-600 hover:text-red-800 font-medium">Remove</button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </>
    );
};


// --- MAIN APP COMPONENT ---
function AdminApp() {
    const [data, setData] = useState({ students: [], subjects: [], exam_halls: [], examinations: [], schedules: [], allocations: [] });
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState({ message: '', type: '' });
    
    const [view, setView] = useState('dashboard');
    const [selectedExam, setSelectedExam] = useState(null);
    const [selectedSchedule, setSelectedSchedule] = useState(null);

    const handleNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification({ message: '', type: '' }), 5000);
    };

    const fetchData = useCallback(async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/dashboard-data`);
            setData(response.data);
        } catch (error) { handleNotification('error', 'Network Error: Could not connect to server.'); }
    }, []);

    useEffect(() => {
        setLoading(true);
        fetchData().then(() => setLoading(false));
    }, [fetchData]);

    const handleUpdate = (type, message) => {
        handleNotification(type, message);
        fetchData();
    };

    const enrichedSchedules = useMemo(() => {
        return data.schedules.map(s => {
            const exam = data.examinations.find(e => e.exam_id === s.exam_id);
            const subject = data.subjects.find(sub => sub.subject_id === s.subject_id);
            return { ...s, exam_name: exam?.exam_name || 'N/A', subject_name: subject?.subject_name || 'N/A' };
        });
    }, [data.schedules, data.examinations, data.subjects]);

    const navigateTo = (targetView) => {
        setView(targetView);
        if (targetView === 'dashboard' || targetView === 'examinationsList') {
            setSelectedExam(null);
            setSelectedSchedule(null);
        }
    };

    const handleSelectExam = (exam) => {
        setSelectedExam(exam);
        setView('examSchedule');
    };

    const handleSelectSchedule = (schedule) => {
        setSelectedSchedule(schedule);
        setView('allocationDetail');
    };

    const renderContent = () => {
        switch (view) {
            case 'examinationsList':
                return <ExaminationsListView examinations={data.examinations} onSelectExam={handleSelectExam} />;
            case 'examSchedule':
                return <ExamScheduleView selectedExam={selectedExam} schedules={enrichedSchedules} onSelectSchedule={handleSelectSchedule} />;
            case 'allocationDetail':
                return <AllocationDetailView selectedSchedule={selectedSchedule} data={data} onUpdate={handleUpdate} />;
            case 'dashboard':
            default:
                return <DashboardView data={data} handleUpdate={handleUpdate} enrichedSchedules={enrichedSchedules} />;
        }
    };
    
    const Breadcrumbs = () => (
        <div className="text-sm text-gray-500 flex items-center space-x-1">
            <span className="cursor-pointer hover:underline" onClick={() => navigateTo('dashboard')}>Dashboard</span>
            <ChevronRightIcon />
            <span className={selectedExam ? "cursor-pointer hover:underline" : ""} onClick={() => navigateTo('examinationsList')}>Examinations</span>
            {selectedExam && <><ChevronRightIcon /><span className={selectedSchedule ? "cursor-pointer hover:underline" : ""} onClick={() => { setView('examSchedule'); setSelectedSchedule(null); }}>{selectedExam.exam_name}</span></>}
            {selectedSchedule && <><ChevronRightIcon /><span>{selectedSchedule.subject_name}</span></>}
        </div>
    );

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    return (
        <div className="bg-gray-100 min-h-screen flex">
            <Notification message={notification.message} type={notification.type} onDismiss={() => setNotification({ message: '', type: '' })} />
            <aside className="w-64 bg-gray-800 text-white flex flex-col flex-shrink-0">
                <div className="h-20 flex items-center justify-center text-2xl font-bold border-b border-gray-700">Exam Portal</div>
                <nav className="flex-1 px-4 py-6 space-y-2">
                    <a href="#" onClick={(e) => { e.preventDefault(); navigateTo('dashboard'); }} className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${view === 'dashboard' ? 'bg-gray-900' : 'hover:bg-gray-700'}`}>
                        <HomeIcon /><span>Dashboard</span>
                    </a>
                    <a href="#" onClick={(e) => { e.preventDefault(); navigateTo('examinationsList'); }} className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${view !== 'dashboard' ? 'bg-gray-900' : 'hover:bg-gray-700'}`}>
                        <ExamIcon /><span>Examinations</span>
                    </a>
                </nav>
            </aside>
            <div className="flex-1 flex flex-col min-w-0">
                <header className="bg-white shadow-sm h-20 flex items-center px-8 justify-between flex-shrink-0">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">
                           {view === 'dashboard' ? 'Dashboard Overview' : 'Examination Details'}
                        </h1>
                        {view !== 'dashboard' && <Breadcrumbs />}
                    </div>
                </header>
                <main className="flex-1 p-8 overflow-y-auto">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
}

export default AdminApp;