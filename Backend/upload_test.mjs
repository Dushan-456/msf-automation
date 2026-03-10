import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

async function testUpload() {
  const form = new FormData();
  form.append('csvFile', fs.createReadStream('../test-doctors.csv'));

  try {
    const res = await axios.post('http://localhost:5000/api/v1/automate-surveys', form, {
      headers: form.getHeaders(),
    });
    
    const jobId = res.data.jobId;
    console.log('Started Job:', jobId);
    
    // Poll every 3 seconds
    const interval = setInterval(async () => {
        try {
            const statusRes = await axios.get(`http://localhost:5000/api/v1/status/${jobId}`);
            console.log(statusRes.data);
            if (statusRes.data.status === 'completed' || statusRes.data.status === 'failed') {
                clearInterval(interval);
            }
        } catch(e) {
            console.error(e.message);
        }
    }, 3000);
    
  } catch (error) {
    console.error('Upload failed:', error.response ? error.response.data : error.message);
  }
}

testUpload();
