const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Health check endpoint
app.get('/', (req, res) => {
    res.send('Simply Computerz AI Phone Agent Backend is running.');
});

// AI Agent Webhook Endpoint (e.g. for Vapi.ai)
// The AI will send a POST request here when it wants to execute the "book_appointment" tool.
app.post('/api/webhook', async (req, res) => {
    try {
        const { message } = req.body;
        
        // The AI platform sends a 'tool-calls' message when it determines the caller wants to book
        if (message && message.type === 'tool-calls') {
            const toolCall = message.toolCalls[0];
            
            if (toolCall.function.name === 'book_appointment') {
                const args = JSON.parse(toolCall.function.arguments);
                const { customer_name, phone_number, issue_description, preferred_time } = args;
                
                console.log('--- NEW AI BOOKING RECEIVED ---');
                console.log(`Customer: ${customer_name}`);
                console.log(`Phone: ${phone_number}`);
                console.log(`Issue: ${issue_description}`);
                console.log(`Time: ${preferred_time}`);
                console.log('-------------------------------');

                // TODO: Here you would integrate with Google Calendar API or send an email
                // to yourself (using Nodemailer or SendGrid) to confirm the booking in real life.

                // Tell the AI the booking was successful so it can tell the caller!
                return res.json({
                    results: [{
                        toolCallId: toolCall.id,
                        result: `Success! The appointment has been booked for ${preferred_time}. Tell the user you look forward to fixing their issue.`
                    }]
                });
            }
        }

        // Default response
        res.status(200).send('Webhook received');
    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Simply Computerz AI Backend listening on port ${PORT}`);
    console.log(`Deploy this server to a free hosting provider (like Render.com) to get a live URL for your AI Agent!`);
});
