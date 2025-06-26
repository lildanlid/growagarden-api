import fs from 'fs';
import path from 'path';

const DATABASE_PATH = path.join(process.cwd(), 'data', 'Database.json');

export default async function handler(req, res) {
  try {

    if (req.method === 'GET') {

      const fileContents = fs.readFileSync(DATABASE_PATH, 'utf-8');

      const data = JSON.parse(fileContents);

      return res.status(200).json(data);
    } else {

      return res.status(405).json({ error: 'Method Not Allowed' });
    }
  } catch (error) {

    console.error('Error reading Database.json:', error);
    return res.status(500).json({ error: 'Failed to read Database.json' });
  }
}
