import express from 'express';
import cors from 'cors';
import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(express.json());

const EXCEL_PATH = path.join(process.cwd(), 'data', 'Empresas Caro.xlsx');

// Helper function to read the Excel file
const readExcel = () => {
  if (!fs.existsSync(EXCEL_PATH)) {
    return [];
  }
  const workbook = xlsx.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(sheet);
};

// Helper function to write to the Excel file
const writeExcel = (data) => {
  const workbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.json_to_sheet(data);
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  xlsx.writeFile(workbook, EXCEL_PATH);
};

// Get all clients
app.get('/api/clients', (req, res) => {
  try {
    const data = readExcel();
    // Add an internal ID for frontend mapping
    const dataWithId = data.map((row, index) => ({ id: index, ...row }));
    res.json(dataWithId);
  } catch (error) {
    console.error('Error reading excel:', error);
    res.status(500).json({ error: 'Error reading database' });
  }
});

// Update client status
app.put('/api/clients/update', (req, res) => {
  try {
    const { id, contrato, nombre, estado } = req.body;
    
    if (!estado) {
      return res.status(400).json({ error: 'Estado invalido' });
    }

    const data = readExcel();
    
    let rowIndex = data.findIndex(row => 
      row['Contrato ARL DESC'] === contrato && 
      row['Empresa Nombre Comercial'] === nombre
    );

    if (rowIndex === -1 && id !== undefined && id >= 0 && id < data.length) {
      rowIndex = id;
    }

    if (rowIndex === -1) {
      return res.status(404).json({ error: 'Client not found' });
    }

    data[rowIndex]['Estado de Atención'] = estado;
    writeExcel(data);

    res.json({ success: true, client: data[rowIndex] });
  } catch (error) {
    console.error('Error updating excel:', error);
    res.status(500).json({ error: 'Error updating database' });
  }
});

// Export the Express API for Vercel
export default app;
