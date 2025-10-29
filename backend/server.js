// Initialize Application Insights first (must be before other imports)
const appInsights = require('applicationinsights');
if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
    appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
        .setAutoDependencyCorrelation(true)
        .setAutoCollectRequests(true)
        .setAutoCollectPerformance(true, true)
        .setAutoCollectExceptions(true)
        .setAutoCollectDependencies(true)
        .setAutoCollectConsole(true)
        .setUseDiskRetryCaching(true)
        .setSendLiveMetrics(true)
        .start();
    console.log('Application Insights initialized');
}

const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
var RateLimit = require('express-rate-limit');
var limiter = RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per windowMs
});

// apply rate limiter to all requests
app.use(limiter);

// CORS Configuration
app.use(cors({
    origin: [
        'https://hallticket-frontend.graywave-4f251e45.centralindia.azurecontainerapps.io',
        'http://localhost:5173', // For local development
        'http://localhost:3000'
    ],
    credentials: true
}));

// Security Headers Middleware
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    next();
});

app.use(express.json());

const port = process.env.PORT || 3000;

const GEMINI_API_KEY = "AIzaSyCrOzKWo6aa2Zr5SLL1fxX143toJqT0B-w"; 
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const dbConfig = {
    user: 'adminuser',
    password: 'Changeme@123',
    server: 'idinfoservice.database.windows.net',
    database: 'idinfoserver',
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

let pool;
async function connectToDb() {
    try {
        if (pool) return pool;
        pool = await sql.connect(dbConfig);
        console.log('Successfully connected to MSSQL.');
        return pool;
    } catch (err) {
        console.error('Error connecting to MSSQL:', err);
        process.exit(1);
    }
}

// --- API Endpoints ---

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Backend is running' });
});

app.get('/api/dashboard-data', async (req, res) => {
    try {
        const pool = await connectToDb();
        const [ students, subjects, halls, exams, schedules, allocations ] = await Promise.all([
            pool.request().query('SELECT * FROM dbo.students'),
            pool.request().query('SELECT * FROM dbo.subjects'),
            pool.request().query('SELECT * FROM dbo.exam_halls'),
            pool.request().query('SELECT * FROM dbo.examinations'),
            pool.request().query('SELECT schedule_id, exam_id, subject_id, exam_date, start_time FROM dbo.exam_schedule'),
            pool.request().query('SELECT * FROM dbo.student_allocations')
        ]);
        res.json({
            students: students.recordset,
            subjects: subjects.recordset,
            exam_halls: halls.recordset,
            examinations: exams.recordset,
            schedules: schedules.recordset,
            allocations: allocations.recordset,
        });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to fetch dashboard data' });
    }
});

app.get('/api/student/:student_id/allocations', async (req, res) => {
    try {
        const { student_id } = req.params;
        const pool = await connectToDb();
        const result = await pool.request()
            .input('student_id', sql.VarChar(50), student_id)
            .query(`
                SELECT 
                    s.name AS student_name, s.roll_no, s.student_class,
                    e.exam_name, sub.subject_name, sch.exam_date, sch.start_time,
                    h.hall_name, alloc.seat_number
                FROM dbo.student_allocations alloc
                JOIN dbo.students s ON alloc.student_id = s.student_id
                JOIN dbo.exam_schedule sch ON alloc.schedule_id = sch.schedule_id
                JOIN dbo.examinations e ON sch.exam_id = e.exam_id
                JOIN dbo.subjects sub ON sch.subject_id = sub.subject_id
                LEFT JOIN dbo.exam_halls h ON alloc.hall_id = h.hall_id
                WHERE alloc.student_id = @student_id AND alloc.hall_id IS NOT NULL;
            `);
        res.json(result.recordset);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to fetch student hall tickets.' });
    }
});

app.post('/api/examinations', async (req, res) => {
    try {
        const { exam_name, start_date, end_date } = req.body;
        const pool = await connectToDb();
        await pool.request()
            .input('exam_name', sql.VarChar(100), exam_name)
            .input('start_date', sql.Date, start_date)
            .input('end_date', sql.Date, end_date)
            .query('INSERT INTO dbo.examinations (exam_name, start_date, end_date) VALUES (@exam_name, @start_date, @end_date)');
        res.status(201).json({ message: 'Examination created successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to create examination' });
    }
});

app.post('/api/exam-schedule', async (req, res) => {
    try {
        const { exam_id, subject_id, exam_date, start_time } = req.body;
        const startTimeAsDate = new Date(`1970-01-01T${start_time}`);
        const pool = await connectToDb();
        await pool.request()
            .input('exam_id', sql.Int, exam_id)
            .input('subject_id', sql.Int, subject_id)
            .input('exam_date', sql.Date, exam_date)
            .input('start_time', sql.Time, startTimeAsDate)
            .query('INSERT INTO dbo.exam_schedule (exam_id, subject_id, exam_date, start_time) VALUES (@exam_id, @subject_id, @exam_date, @start_time)');
        res.status(201).json({ message: 'Schedule created successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to create schedule' });
    }
});

app.post('/api/register-students', async (req, res) => {
    const { schedule_id, student_ids } = req.body;
    if (!schedule_id || !student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
        return res.status(400).json({ message: 'Schedule ID and a list of student IDs are required.' });
    }
    const pool = await connectToDb();
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();
        for (const student_id of student_ids) {
            const request = new sql.Request(transaction);
            await request
                .input('student_id', sql.VarChar(50), student_id)
                .input('schedule_id', sql.Int, schedule_id)
                .query('INSERT INTO dbo.student_allocations (student_id, schedule_id) VALUES (@student_id, @schedule_id)');
        }
        await transaction.commit();
        res.status(201).json({ message: `Successfully registered ${student_ids.length} students.` });
    } catch (error) {
        await transaction.rollback();
        if (error.number === 2627) {
            return res.status(409).json({ message: 'One or more students are already registered for this schedule.' });
        }
        res.status(500).json({ message: error.message || 'Failed to register students.' });
    }
});


// --- GEN AI ENDPOINTS ---

app.post('/api/generate-allocation-plan', async (req, res) => {
    const { schedule_id, prompt } = req.body;
    console.log('Generate plan request:', { schedule_id, promptLength: prompt?.length });
    
    if (!schedule_id || !prompt) {
        return res.status(400).json({ message: 'Schedule ID and prompt are required.' });
    }
    try {
        const pool = await connectToDb();
        const studentsToAllocate = await pool.request()
            .input('schedule_id', sql.Int, schedule_id)
            .query(`
                SELECT s.student_id, s.roll_no, s.name, s.student_class 
                FROM dbo.student_allocations sa
                JOIN dbo.students s ON sa.student_id = s.student_id
                WHERE sa.schedule_id = @schedule_id AND sa.hall_id IS NULL;
            `);
        
        console.log(`Found ${studentsToAllocate.recordset.length} un-allocated students`);
        
        if (studentsToAllocate.recordset.length === 0) {
            return res.status(404).json({ message: 'No un-allocated students found for this schedule.' });
        }
        const hallsResult = await pool.request().query('SELECT hall_id, hall_name, capacity FROM dbo.exam_halls');
        const availableHalls = hallsResult.recordset;
        
        console.log(`Found ${availableHalls.length} available halls`);
        
        // Get already occupied seats for this schedule
        const occupiedSeatsResult = await pool.request()
            .input('schedule_id', sql.Int, schedule_id)
            .query(`
                SELECT hall_id, seat_number 
                FROM dbo.student_allocations 
                WHERE schedule_id = @schedule_id 
                  AND hall_id IS NOT NULL 
                  AND seat_number IS NOT NULL
            `);
        const occupiedSeats = occupiedSeatsResult.recordset;
        
        console.log(`Found ${occupiedSeats.length} already occupied seats`);
        
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
        const fullPrompt = `
            You are an expert university examination logistics planner. Your task is to create an optimal seating allocation plan for students who are already registered for an exam but do not have a seat.
            
            Here are the un-allocated students:
            ${JSON.stringify(studentsToAllocate.recordset, null, 2)}
            
            Here are the available exam halls with their capacities:
            ${JSON.stringify(availableHalls, null, 2)}
            
            IMPORTANT: These seats are ALREADY OCCUPIED and must NOT be used:
            ${occupiedSeats.length > 0 ? JSON.stringify(occupiedSeats, null, 2) : 'None - all seats are available'}
            
            The user has provided these specific instructions: "${prompt}"
            Generate a JSON object containing two keys:
            1. "reasoning": A brief, natural-language explanation of your plan.
            2. "plan": An array of allocation objects. Each object must have:
               - "student_id": string, exactly as provided in the student list
               - "hall_id": integer, from the available halls
               - "seat_number": string, format as "A1", "A2", "B1", etc. (maximum 10 characters)
            
            IMPORTANT FORMATTING RULES:
            - seat_number MUST be a string (e.g., "A1", "B15", "C3")
            - seat_number MUST be unique within each hall
            - seat_number MUST NOT exceed 10 characters
            - DO NOT assign any seat that is already occupied (check the occupied seats list above)
            - Only allocate to empty/available seats
            - Respond ONLY with the raw JSON object. Do not wrap it in markdown code blocks.
            
            Example format:
            {
              "reasoning": "Allocated students based on...",
              "plan": [
                {"student_id": "S001", "hall_id": 1, "seat_number": "A1"},
                {"student_id": "S002", "hall_id": 1, "seat_number": "A2"}
              ]
            }`;
        
        console.log('Calling Gemini AI...');
        const result = await model.generateContent(fullPrompt);
        const responseText = result.response.text();
        console.log('AI response received, length:', responseText.length);

        // ### THIS SECTION IS NOW CORRECTED ###
        // Clean and parse the AI's response to handle markdown wrappers.
        const match = responseText.match(/\{[\s\S]*\}/);
        if (!match) {
            console.error("Failed to find JSON in AI response:", responseText);
            throw new Error("Invalid or malformed JSON response from AI");
        }
        const jsonString = match[0];
        const planJson = JSON.parse(jsonString);
        
        console.log(`AI plan parsed successfully, ${planJson.plan?.length || 0} allocations generated`);

        res.status(200).json(planJson);

    } catch (error) {
        console.error("Error in AI plan generation:", error);
        res.status(500).json({ message: error.message || "An error occurred while generating the AI allocation plan." });
    }
});

app.post('/api/execute-allocation-plan', async (req, res) => {
    const { plan, schedule_id } = req.body;
    console.log('Execute plan request:', { planLength: plan?.length, schedule_id });
    
    if (!plan || !schedule_id || !Array.isArray(plan) || plan.length === 0) {
        return res.status(400).json({ message: 'A valid plan and schedule_id are required.' });
    }
    
    // Validate plan structure
    for (let i = 0; i < plan.length; i++) {
        const item = plan[i];
        if (!item.student_id || !item.hall_id || item.seat_number === undefined || item.seat_number === null) {
            return res.status(400).json({ 
                message: `Invalid plan item at index ${i}: missing student_id, hall_id, or seat_number. Got: ${JSON.stringify(item)}` 
            });
        }
        
        // Check seat_number type
        if (typeof item.seat_number !== 'string' && typeof item.seat_number !== 'number') {
            return res.status(400).json({ 
                message: `Invalid seat_number type at index ${i}: expected string or number, got ${typeof item.seat_number}` 
            });
        }
    }
    
    const pool = await connectToDb();
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();
        let updatedCount = 0;
        
        for (const alloc of plan) {
            const request = new sql.Request(transaction);
            
            // Debug: Log the allocation object
            console.log('Processing allocation:', JSON.stringify(alloc));
            
            // Convert seat_number to string and ensure it's valid
            let seatNumber = alloc.seat_number;
            
            // Handle null, undefined, empty string
            if (seatNumber === null || seatNumber === undefined || seatNumber === '') {
                throw new Error(`seat_number is null/undefined/empty for student ${alloc.student_id}. Full allocation: ${JSON.stringify(alloc)}`);
            }
            
            if (typeof seatNumber === 'number') {
                seatNumber = seatNumber.toString();
            } else if (typeof seatNumber === 'string') {
                seatNumber = seatNumber.trim(); // Remove whitespace
                if (seatNumber === '') {
                    throw new Error(`seat_number is empty string after trim for student ${alloc.student_id}`);
                }
            } else if (typeof seatNumber === 'object') {
                throw new Error(`seat_number is an object for student ${alloc.student_id}: ${JSON.stringify(seatNumber)}`);
            } else {
                throw new Error(`Invalid seat_number type for student ${alloc.student_id}: ${typeof seatNumber}, value: ${seatNumber}`);
            }
            
            // Validate seat_number length (max 10 chars for VarChar(10))
            if (seatNumber.length > 10) {
                throw new Error(`Seat number too long for student ${alloc.student_id}: "${seatNumber}" (${seatNumber.length} chars)`);
            }
            
            // Log character codes to check for invisible characters
            const charCodes = Array.from(seatNumber).map(c => c.charCodeAt(0));
            console.log(`Validated seat_number: "${seatNumber}" (type: ${typeof seatNumber}, length: ${seatNumber.length}, charCodes: ${JSON.stringify(charCodes)})`);
            
            // Check if seat is already occupied in this hall for this schedule
            const checkRequest = new sql.Request(transaction);
            const seatCheckResult = await checkRequest
                .input('check_schedule_id', sql.Int, schedule_id)
                .input('check_hall_id', sql.Int, alloc.hall_id)
                .input('check_seat_number', sql.VarChar(10), seatNumber)
                .query(`
                    SELECT COUNT(*) as count 
                    FROM dbo.student_allocations 
                    WHERE schedule_id = @check_schedule_id 
                      AND hall_id = @check_hall_id 
                      AND seat_number = @check_seat_number
                `);
            
            if (seatCheckResult.recordset[0].count > 0) {
                throw new Error(`Seat ${seatNumber} in hall ${alloc.hall_id} is already occupied for this schedule`);
            }
            
            console.log(`Allocating student ${alloc.student_id} to hall ${alloc.hall_id}, seat ${seatNumber}`);
            
            // Create new request for the update (since we used the previous one for checking)
            const updateRequest = new sql.Request(transaction);
            const result = await updateRequest
                .input('hall_id', sql.Int, alloc.hall_id)
                .input('seat_number', sql.VarChar(10), seatNumber)
                .input('student_id', sql.VarChar(50), alloc.student_id)
                .input('schedule_id', sql.Int, schedule_id)
                .query(`
                    UPDATE dbo.student_allocations 
                    SET hall_id = @hall_id, seat_number = @seat_number 
                    WHERE student_id = @student_id AND schedule_id = @schedule_id;
                `);
            
            if (result.rowsAffected[0] === 0) {
                throw new Error(`Student ${alloc.student_id} not found in schedule ${schedule_id}`);
            }
            updatedCount++;
        }
        
        await transaction.commit();
        console.log(`Successfully allocated ${updatedCount} seats`);
        res.status(200).json({ message: `Successfully allocated seats for ${updatedCount} students.` });
    } catch (error) {
        console.error('Error executing allocation plan:', error);
        await transaction.rollback().catch(rollbackErr => {
            console.error('Rollback error:', rollbackErr);
        });
        res.status(500).json({ message: error.message || 'Failed to execute allocation plan.' });
    }
});
app.delete('/api/allocations/:allocation_id', async (req, res) => {
    try {
        const { allocation_id } = req.params;
        const pool = await connectToDb();
        const result = await pool.request()
            .input('allocation_id', sql.Int, allocation_id)
            .query('DELETE FROM dbo.student_allocations WHERE allocation_id = @allocation_id');
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Allocation record not found.' });
        }
        res.status(200).json({ message: 'Student removed from schedule successfully.' });
    } catch(error) {
        console.error('Error removing student from schedule:', error);
        res.status(500).json({ message: error.message || 'Failed to remove student.' });
    }
});
app.put('/api/allocations/:allocation_id', async (req, res) => {
    const { allocation_id } = req.params;
    const { hall_id, seat_number } = req.body;
    if (!hall_id || !seat_number) {
        return res.status(400).json({ message: 'Hall and seat number are required.' });
    }
    const pool = await connectToDb();
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();
        const request = new sql.Request(transaction);

        // First, get the schedule_id for the allocation we are updating
        const scheduleResult = await request.input('alloc_id_for_sched', sql.Int, allocation_id).query('SELECT schedule_id FROM dbo.student_allocations WHERE allocation_id = @alloc_id_for_sched');
        const schedule_id = scheduleResult.recordset[0]?.schedule_id;
        if (!schedule_id) throw new Error('Allocation record not found.');

        // Now, check if the desired seat is already taken in that hall for that schedule
        const seatCheckResult = await request
            .input('schedule_id_check', sql.Int, schedule_id)
            .input('hall_id_check', sql.Int, hall_id)
            .input('seat_number_check', sql.VarChar(10), seat_number)
            .query('SELECT COUNT(*) as count FROM dbo.student_allocations WHERE schedule_id = @schedule_id_check AND hall_id = @hall_id_check AND seat_number = @seat_number_check');
        
        if (seatCheckResult.recordset[0].count > 0) {
            await transaction.rollback();
            return res.status(409).json({ message: `Seat ${seat_number} is already taken in this hall for this schedule.` });
        }

        // If the seat is free, update the record
        await request
            .input('hall_id_update', sql.Int, hall_id)
            .input('seat_number_update', sql.VarChar(10), seat_number)
            .input('allocation_id_update', sql.Int, allocation_id)
            .query('UPDATE dbo.student_allocations SET hall_id = @hall_id_update, seat_number = @seat_number_update WHERE allocation_id = @allocation_id_update');

        await transaction.commit();
        res.status(200).json({ message: 'Student allocated successfully.' });
    } catch (error) {
        await transaction.rollback();
        res.status(500).json({ message: error.message || 'Failed to allocate seat.' });
    }
});

// --- NEW HELPER ENDPOINT to get taken seats ---
app.get('/api/schedules/:schedule_id/halls/:hall_id/occupied-seats', async (req, res) => {
    try {
        const { schedule_id, hall_id } = req.params;
        const pool = await connectToDb();
        const result = await pool.request()
            .input('schedule_id', sql.Int, schedule_id)
            .input('hall_id', sql.Int, hall_id)
            .query('SELECT seat_number FROM dbo.student_allocations WHERE schedule_id = @schedule_id AND hall_id = @hall_id AND seat_number IS NOT NULL');
        
        const occupiedSeats = result.recordset.map(r => r.seat_number);
        res.json(occupiedSeats);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Could not fetch occupied seats.' });
    }
});
app.get('/api/hallticket/:student_id', async (req, res) => {
    try {
        const { student_id } = req.params;
        const pool = await connectToDb();
        const result = await pool.request()
            .input('student_id', sql.VarChar(50), student_id)
            .query(`
                SELECT 
                    s.name AS student_name, s.roll_no, s.student_class,
                    e.exam_id, e.exam_name,
                    sub.subject_code, sub.subject_name, 
                    sch.exam_date, sch.start_time,
                    h.hall_name, alloc.seat_number
                FROM dbo.student_allocations alloc
                JOIN dbo.students s ON alloc.student_id = s.student_id
                JOIN dbo.exam_schedule sch ON alloc.schedule_id = sch.schedule_id
                JOIN dbo.examinations e ON sch.exam_id = e.exam_id
                JOIN dbo.subjects sub ON sch.subject_id = sub.subject_id
                LEFT JOIN dbo.exam_halls h ON alloc.hall_id = h.hall_id
                WHERE alloc.student_id = @student_id AND alloc.hall_id IS NOT NULL AND alloc.seat_number IS NOT NULL
                ORDER BY e.exam_name, sch.exam_date, sch.start_time;
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'No allocated hall tickets found for this student.' });
        }

        // Process the flat data into a grouped structure
        const studentDetails = {
            name: result.recordset[0].student_name,
            roll_no: result.recordset[0].roll_no,
            student_class: result.recordset[0].student_class
        };

        const examinations = result.recordset.reduce((acc, record) => {
            let exam = acc.find(e => e.exam_id === record.exam_id);
            if (!exam) {
                exam = {
                    exam_id: record.exam_id,
                    exam_name: record.exam_name,
                    subjects: []
                };
                acc.push(exam);
            }
            exam.subjects.push({
                subject_code: record.subject_code,
                subject_name: record.subject_name,
                date: record.exam_date,
                time: record.start_time,
                hall: record.hall_name,
                seat: record.seat_number
            });
            return acc;
        }, []);

        res.json({ studentDetails, examinations });

    } catch (error) {
        console.error("Error fetching hall ticket data:", error);
        res.status(500).json({ message: error.message || 'Failed to fetch hall ticket data.' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    connectToDb();
});