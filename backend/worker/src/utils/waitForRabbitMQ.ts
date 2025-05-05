import * as amqp from 'amqplib';

export async function waitForRabbitMQ(
  url: string,
  retries = 20,
  delay = 1000
): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await amqp.connect(url);
      await conn.close();
      console.log('✅ RabbitMQ is up.');
      return;
    } catch (err) {
      console.log(`⏳ Waiting for RabbitMQ... (${i + 1}/${retries})`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw new Error('❌ RabbitMQ not available after multiple retries.');
}
