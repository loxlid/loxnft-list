const { sql } = require('@vercel/postgres');

module.exports = async function handler(request, response) {
    if (request.method !== 'GET') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const { username } = request.query;
    if (!username) {
        return response.status(400).json({ error: 'Username required' });
    }

    try {
        const { rows } = await sql`SELECT * FROM loxnft_projects WHERE username = ${username} ORDER BY created_at ASC`;
        return response.status(200).json({ success: true, projects: rows });
    } catch (error) {
        console.error(error);
        return response.status(500).json({ error: 'Database error fetching projects' });
    }
};
