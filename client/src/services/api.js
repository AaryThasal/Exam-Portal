import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Auth API
export const authAPI = {
    login: async (email, password, role) => {
        const response = await api.post('/auth/login', { email, password, role });
        return response.data;
    }
};

// Exams API
export const examsAPI = {
    getAll: async () => {
        const response = await api.get('/exams');
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/exams/${id}`);
        return response.data;
    },

    create: async (examData) => {
        const response = await api.post('/exams', examData);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/exams/${id}`);
        return response.data;
    }
};

// Violations API
export const violationsAPI = {
    log: async (violationData) => {
        const response = await api.post('/violations', violationData);
        return response.data;
    },

    getAll: async () => {
        const response = await api.get('/violations');
        return response.data;
    },

    getByExam: async (examId) => {
        const response = await api.get(`/violations/exam/${examId}`);
        return response.data;
    },

    getAggregated: async () => {
        const response = await api.get('/violations/aggregated');
        return response.data;
    }
};

// Sessions API
export const sessionsAPI = {
    create: async (sessionData) => {
        const response = await api.post('/sessions', sessionData);
        return response.data;
    },

    getAll: async () => {
        const response = await api.get('/sessions');
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/sessions/${id}`);
        return response.data;
    }
};

export default api;
