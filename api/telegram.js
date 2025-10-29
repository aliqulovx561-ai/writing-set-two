const axios = require('axios');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, studentName, task1WordCount, task2WordCount, violations, duration } = req.body;

    // Get environment variables
    const BOT_TOKEN = process.env.BOT_TOKEN;
    const CHAT_ID = process.env.CHAT_ID;

    if (!BOT_TOKEN || !CHAT_ID) {
      console.error('Missing environment variables: BOT_TOKEN or CHAT_ID');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
    }

    console.log('Received test submission from:', studentName);

    // Send to Telegram
    const telegramResult = await sendToTelegram(message, BOT_TOKEN, CHAT_ID);
    
    if (telegramResult.success) {
      // Log to Vercel functions log
      console.log('✅ Telegram submission successful for:', studentName);
      
      res.status(200).json({
        success: true,
        message: 'Test submitted successfully and sent to examiner',
        telegramMessageId: telegramResult.data.result.message_id
      });
    } else {
      // If Telegram fails, log and still return success
      console.log('❌ Telegram failed, but logged locally for:', studentName);
      console.log('TELEGRAM MESSAGE:', message);
      
      res.status(200).json({
        success: true,
        message: 'Test submitted successfully (Telegram delivery failed, but logged locally)',
        telegramError: telegramResult.error
      });
    }
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

async function sendToTelegram(message, botToken, chatId) {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const response = await axios.post(url, {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    });
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Telegram API Error:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.description || error.message 
    };
  }
}
