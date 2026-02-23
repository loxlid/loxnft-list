const { sql } = require('@vercel/postgres');

module.exports = async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const { username, name, twitter, type, mint_date, status } = request.body;

    if (!username || !name) {
        return response.status(400).json({ error: 'Username and Project Name required' });
    }

    try {
        const { rows } = await sql`
      INSERT INTO projects (username, name, twitter, type, mint_date, status)
      VALUES (${username}, ${name}, ${twitter}, ${type}, ${mint_date}, ${status})
      RETURNING *;
    `;
        return response.status(200).json({ success: true, project: rows[0] });
    } catch (error) {
        console.error(error);
        return response.status(500).json({ error: 'Database error adding project' });
    }
};
