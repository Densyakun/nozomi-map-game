/**
 * axiosを使用したOverpass APIのテストスクリプト
 */

import axios from 'axios';

const overpass = 'https://overpass.kumi.systems/api/interpreter';
const query = `[out:json][timeout:30];way["highway"](35.65,139.6,35.75,139.8);(._;>;);out;`;

axios.post(overpass, `data=${encodeURIComponent(query)}`, {
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  }
}).then(result => {
    console.log('Success!');
    console.log('Elements:', result.data.elements?.length || 0);
    console.log('Data:', JSON.stringify(result.data, null, 2).substring(0, 500));
}).catch(error => {
    console.log('Error:', error.message);
    if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Data:', error.response.data);
    }
});
