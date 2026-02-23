const { sql } = require('@vercel/postgres');

module.exports = async function handler(request, response) {
    try {
        // Attempt to create users table and projects table
        await sql`
      CREATE TABLE IF NOT EXISTS users (
        username varchar(255) PRIMARY KEY,
        password varchar(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

        await sql`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        username varchar(255) REFERENCES users(username),
        name varchar(255) NOT NULL,
        twitter varchar(255),
        type varchar(255),
        mint_date varchar(255),
        status varchar(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

        return response.status(200).json({ success: true, message: 'Database initialized successfully' });
    } catch (error) {
        console.error(error);
        return response.status(500).json({ success: false, error: 'Database initialization failed' });
    }
};
