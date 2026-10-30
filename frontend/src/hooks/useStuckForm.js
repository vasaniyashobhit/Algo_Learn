import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { checkStuckInput } from '../lib/stuckInput.js';
import { useSubmitStuckMutation } from './mutations/stuck.mutations.js';
import { usePasteImage } from './usePasteImage.js';

const EMPTY = { text: '', url: '', pdf: null, image: null };

const inputFor = (tab, values) => ({
  inputType: tab,
  text: values.text,
  url: values.url,
  file: tab === 'pdf' || tab === 'image' ? values[tab] : null,
});

/**
 * State of the stuck form: the active tab, one value per tab (switching keeps what was typed),
 * the current issue (a client check or a server error) and the submit. A pasted screenshot
 * switches to the Image tab. Success opens /stuck/:id.
 */
export const useStuckForm = ({ initialUrl = '' } = {}) => {
  const [tab, setTabState] = useState(initialUrl ? 'url' : 'text');
  const [values, setValues] = useState({ ...EMPTY, url: initialUrl });
  const [issue, setIssue] = useState(null);
  const submit = useSubmitStuckMutation();
  const navigate = useNavigate();

  const setValue = useCallback((field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setIssue(null);
  }, []);

  const setTab = useCallback((next) => {
    setTabState(next);
    setIssue(null);
  }, []);

  const pasteImage = useCallback(
    (file) => {
      setTab('image');
      setValue('image', file);
    },
    [setTab, setValue],
  );
  usePasteImage(pasteImage);

  const onSubmit = (event) => {
    event.preventDefault();
    const input = inputFor(tab, values);
    const found = checkStuckInput(input);
    if (found) {
      setIssue(found);
      return;
    }
    setIssue(null);
    submit.mutate(input, { onSuccess: (result) => navigate(`/stuck/${result.id}`), onError: setIssue });
  };

  return { tab, setTab, values, setValue, issue, onSubmit, pending: submit.isPending };
};
