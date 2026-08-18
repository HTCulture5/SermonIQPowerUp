import { useState, useEffect, useRef } from 'react';

export function useSpeechRecognition(isRecording: boolean) {
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [fullTranscript, setFullTranscript] = useState<{text: string, timestamp: number}[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  
  const recognitionRef = useRef<any>(null);
  const isStartedRef = useRef(false);

  useEffect(() => {
    if (!isRecording) {
      setIsListening(false);
      if (recognitionRef.current) {
        try {
          isStartedRef.current = false;
          recognitionRef.current.stop();
        } catch {
          // Ignore stop errors
        }
      }
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech recognition is not supported in this browser environment');
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    setPermissionDenied(false);

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        isStartedRef.current = true;
        setIsListening(true);
        setPermissionDenied(false);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            setTranscript(prev => (prev ? prev + ' ' : '') + text.trim());
            setFullTranscript(prev => [...prev, { text: text.trim(), timestamp: Date.now() }]);
            setInterimTranscript('');
          } else {
            interim += text;
            setInterimTranscript(interim);
          }
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') return;
        if (event.error === 'aborted') {
          isStartedRef.current = false;
          setIsListening(false);
          return;
        }
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          console.warn('Microphone or Speech Recognition permission was not granted by browser.');
          setPermissionDenied(true);
          isStartedRef.current = false;
          setIsListening(false);
          return;
        }
        
        console.warn('Speech recognition status notification:', event.error);
        isStartedRef.current = false;
        setIsListening(false);
        
        // Recover if active recording session
        setTimeout(() => {
          if (isRecording && recognitionRef.current && !isStartedRef.current) {
            try {
              recognitionRef.current.start();
            } catch {
              // Ignore restart error if already engaged
            }
          }
        }, 800);
      };

      recognition.onend = () => {
        isStartedRef.current = false;
        setIsListening(false);
        if (isRecording && recognitionRef.current && !permissionDenied) {
          setTimeout(() => {
            if (isRecording && recognitionRef.current && !isStartedRef.current) {
              try {
                recognitionRef.current.start();
              } catch {
                // Ignore restart attempt if already running
              }
            }
          }, 150);
        }
      };

      if (!isStartedRef.current) {
        recognition.start();
      }
    } catch (e) {
      console.warn('Speech recognition could not be started automatically:', e);
    }

    return () => {
      isStartedRef.current = false;
      setIsListening(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [isRecording]);

  return { 
    transcript, 
    interimTranscript, 
    fullTranscript,
    isListening,
    permissionDenied,
    isSupported,
    clearTranscript: () => {
      setTranscript('');
      setInterimTranscript('');
      setFullTranscript([]);
    }
  };
}
