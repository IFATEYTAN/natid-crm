export const useAuth = () => {
  return {
    user: null,
    loading: false,
    signOut: () => {},
    signIn: () => {},
  };
};

export const AuthProvider = ({ children }) => children;
export default AuthProvider;
