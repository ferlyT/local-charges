const http = require('http');
http.get('http://localhost:3001/api/v1/inspection-reports/lookup?search=SE', {
  headers: {
    // I need the token or just disable requirePermission temporarily, no I can't.
  }
});
