import mysql, { Connection } from 'mysql2/promise';

async function createDatabaseIfNotExists() {
  const connection: Connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
  });

  await (connection as any).query(`CREATE DATABASE IF NOT EXISTS farmacia_db`);
  console.log('✅ Banco de dados verificado/criado com sucesso!');
  await connection.end();
}

createDatabaseIfNotExists().catch(console.error);