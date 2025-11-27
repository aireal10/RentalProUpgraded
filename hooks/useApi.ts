import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';

interface QueryClientContextType {
  invalidationToken: number;
  invalidateQueries: (queryKey: string[]) => void;
}

const QueryClientContext = createContext<QueryClientContextType>({
  invalidationToken: 0,
  invalidateQueries: () => {},
});

export const QueryClientProvider = ({ children }: { children?: React.ReactNode }) => {
  const [invalidationToken, setInvalidationToken] = useState(0);

  const invalidateQueries = useCallback((_queryKey: string[]) => {
    setInvalidationToken(token => token + 1);
  }, []);

  return React.createElement(
    QueryClientContext.Provider,
    { value: { invalidateQueries, invalidationToken } },
    children
  );
};

export const useQueryClient = () => {
  return useContext(QueryClientContext);
};

interface UseQueryOptions<TData> {
  queryKey: string[];
  queryFn: () => Promise<TData>;
}

export const useQuery = <TData,>({ queryFn }: UseQueryOptions<TData>) => {
  const [data, setData] = useState<TData | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { invalidationToken } = useContext(QueryClientContext);

  const savedQueryFn = useRef(queryFn);
  useEffect(() => {
    savedQueryFn.current = queryFn;
  }, [queryFn]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await savedQueryFn.current();
      setData(result);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, invalidationToken]);

  return { data, isLoading, error };
};

interface UseMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const useMutation = <TData = unknown, TVariables = void,>({ mutationFn, onSuccess, onError }: UseMutationOptions<TData, TVariables>) => {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const savedMutation = useRef({ mutationFn, onSuccess, onError });
  useEffect(() => {
    savedMutation.current = { mutationFn, onSuccess, onError };
  }, [mutationFn, onSuccess, onError]);

  const mutate = useCallback(async (variables: TVariables) => {
    setIsPending(true);
    setError(null);
    try {
      await savedMutation.current.mutationFn(variables);
      savedMutation.current.onSuccess?.();
    } catch (e) {
      setError(e as Error);
      savedMutation.current.onError?.(e as Error);
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutate, isPending, error };
};