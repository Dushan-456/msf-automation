import { processSurveyMonkeyWorkflow } from './src/services/surveyMonkeyService.mjs';
import dotenv from 'dotenv';
dotenv.config();

processSurveyMonkeyWorkflow({
    doctorName: "Dr. Unit Test",
    trainerName: "Dr. Debugger",
    specialty: "Software",
    level: "Expert",
    emails: "techlabsoftwaresolution@gmail.com"
})
.then(() => console.log('Successfully completed workflow!'))
.catch(err => console.error('Workflow failed:', err.message));
