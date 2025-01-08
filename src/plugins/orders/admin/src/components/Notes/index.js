import { Box, Typography, Divider, Textarea, Grid, GridItem, Button, SingleSelect, SingleSelectOption } from '@strapi/design-system';
import pluginId from '../../pluginId';
import { useState } from 'react';
import { useFetchClient } from '@strapi/helper-plugin';
import { useParams } from "react-router-dom"

const Notes = ({ notes, noteChanges }) => {
    const { post, get, del } = useFetchClient();
    const { id } = useParams()
    const [typeOfNote, setTypeOfNote] = useState('Προσωπική')
    const [newNote, setNewNote] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    const handleValueChange = (e) => {
        setTypeOfNote(e)
    }

    const handleDeleteNoteClick = async (noteId) => {
        const data = await post(`/${pluginId}/deleteNote`, { id, noteId });
        noteChanges()
    }

    const handleAddNoteClick = async () => {
        setIsSaving(true)
        if (newNote !== "" && typeOfNote !== "") {
            
            const data = await post(`/${pluginId}/saveNote`, { id, newNote, typeOfNote });
            noteChanges()
        }
        setIsSaving(false)
    }

    const handleNoteChange = (e) => {
        setNewNote(e.target.value)
    }

    return (
        <Box margin={2} padding={2} background="neutral0">
            <Typography as="h3" variant="delta" fontWeight="bold">Παραγγελία σημειώσεις</Typography>
            {notes.map(note => (
                <Box key={note.id} padding={2} borderStyle="groove" borderWidth="2px" marginTop={2} marginBottom={4} borderRadius="4px">
                    <Box padding={2} background={note.type === "Πελάτη" ? "neutral100" : "neutral200"}>
                        <Typography as="h4" variant="omega">{note.comment}</Typography>
                    </Box>
                    <Box padding={1} background="neutral0">
                        <Grid>
                            <GridItem col={6}>
                                <Typography as="h4" variant="pi">{new Date(note.date).toLocaleDateString('el-GR')} {new Date(note.date).toLocaleTimeString('el-GR')}</Typography>
                            </GridItem>
                            <GridItem col={6}>
                                <Button size="S" variant="danger-light" onClick={() => handleDeleteNoteClick(note.id)}>Διαγραφή</Button>
                            </GridItem>
                        </Grid>
                    </Box>
                </Box>
            ))}
            <Divider margin={2} />
            <Box marginTop={4} >
                <Typography as="h4" variant="pi">Προσθήκη σημείωσης</Typography>
                <Textarea onChange={(e) => handleNoteChange(e)} />
                <Box paddingTop={2} paddingRight={5}>
                    <SingleSelect size="S" value={typeOfNote} onValueChange={(e) => handleValueChange(e)}>
                        <SingleSelectOption value="Πελάτη">Σημείωση σε πελάτη</SingleSelectOption>
                        <SingleSelectOption value="Προσωπική">Προσωπική σημείωση</SingleSelectOption>
                    </SingleSelect>
                </Box>
                <Button size="S" variant="secondary" marginTop={2} loading={isSaving}
                    onClick={() => handleAddNoteClick()}>Προσθήκη</Button>
            </Box>
        </Box>
    )
}

export default Notes