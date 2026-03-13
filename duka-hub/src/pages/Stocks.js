import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Stocks = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/placeholder/store', { replace: true });
  }, [navigate]);
  return null;
};

export default Stocks;
