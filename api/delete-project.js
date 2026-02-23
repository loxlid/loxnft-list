const { sql } = require('@vercel/postgres');

module.exports = async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const { id, username } = request.body;
    if (!id || !username) {
        return response.status(400).json({ error: 'ID and Username required' });
    }

    try {
        const { rowCount } = await sql`DELETE FROM loxnft_projects WHERE id = ${id} AND username = ${username}`;
        if (rowCount > 0) {
            return response.status(200).json({ success: true, message: 'Project deleted' });
        } else {
            return response.status(404).json({ success: false, error: 'Project not found or unauthorized' });
        }
    } catch (error) {
        console.error(error);
        return response.status(500).json({ error: 'Database error deleting project' });
    }
};
