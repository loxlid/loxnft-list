const { sql } = require('@vercel/postgres');

module.exports = async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const { username, password, action } = request.body;
    if (!username || !password) {
        return response.status(400).json({ error: 'Username and password required' });
    }

    try {
        const { rows } = await sql`SELECT * FROM users WHERE username = ${username}`;

        if (rows.length > 0) {
            // User exists, verify password
            if (rows[0].password === password) {
                return response.status(200).json({ success: true, message: 'Login successful' });
            } else {
                return response.status(401).json({ success: false, error: 'Incorrect password' });
            }
        } else {
            // User does not exist, so register if action is register
            if (action === 'register') {
                await sql`INSERT INTO users (username, password) VALUES (${username}, ${password})`;
                return response.status(200).json({ success: true, message: 'Registration successful' });
            } else {
                return response.status(404).json({ success: false, error: 'User not found' });
            }
        }
    } catch (error) {
        console.error(error);
        return response.status(500).json({ error: 'Database error' });
    }
};
