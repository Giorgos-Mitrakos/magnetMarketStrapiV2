import React, { useRef, useState, useEffect } from "react";
import { Table, Thead, Tbody, Tr, Td, Th } from '@strapi/design-system/Table';
import { ModalLayout, ModalBody, ModalHeader, ModalFooter } from '@strapi/design-system/ModalLayout';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { Stack } from '@strapi/design-system/Stack';
import { Link } from '@strapi/design-system/Link';
import { BaseCheckbox } from '@strapi/design-system/BaseCheckbox';
import { Textarea } from '@strapi/design-system/Textarea';
import { Typography } from '@strapi/design-system/Typography';
import { VisuallyHidden } from '@strapi/design-system/VisuallyHidden';
import { Button } from '@strapi/design-system/Button';
import { Loader } from '@strapi/design-system/Loader';
import { ProgressBar } from '@strapi/design-system/ProgressBar';
import { useFetchClient } from '@strapi/helper-plugin';
import pluginId from "../../pluginId";

const UploadFileForm = () => {

    const [importedFiles, setImportedFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isImported, setIsImported] = useState(false);
    const [loadingValue, setLoadingValue] = useState(0);
    const [isOpenModal, setIsOpenModal] = useState(false);
    const [content, setContent] = useState('');
    const [modalData, setModalData] = useState('');
    const inputRefs = useRef([]);
    const ROW_COUNT = 6;
    const COL_COUNT = 10;
    const { post, get, del } = useFetchClient();

    const fetchImport = async () => {
        const data = await get(`/${pluginId}`);
        setImportedFiles(data.data); // Here

        setIsLoading(false);
    };

    useEffect(() => {
        fetchImport();
    }, []);

    const importFile = async (event, entry) => {
        try {
            if (entry.importedFile !== null && entry.importedFile !== undefined) {
                await del(`/upload/files/${entry.importedFile.id}`)
            }
            const data = new FormData();
            data.append('files', event.target.files[0]);
            data.append('ref', 'plugin::import-products.importxml');
            data.append('refId', entry.id);
            data.append('field', 'importedFile');

            await post(`/upload`, data, { headers: { "Content-Type": "multipart/form-data" } })
            setLoadingValue(66);
        }
        catch (error) {
            console.log(error.message)
        }

        return;
    }

    const handleRunImport = async (entry) => {
        setIsImported(true)
        const response = await post(`/${pluginId}/runimport`, { entry });
        if (response.data.message === "ok") {
            await post(`/${pluginId}/importSuccess`, { id: entry.id });
            fetchImport();
        }
        else if (response.data.message === "xml is empty") {
            alert("Το xml του Προμηθευτή είναι άδειο, Παρακαλώ προσπαθήστε αργότερα")
        }
        else if (response.data.message === "Error") {
            alert("Κάποιο σφάλμα δημιουργήθηκε")
        }
        setIsImported(false)
    }

    const handleOnChangeFileInput = async (event, entry) => {
        event.preventDefault();
        setLoadingValue(33);
        try {
            await importFile(event, entry);
            setLoadingValue(100);
            setIsLoading(true);
            fetchImport();
        } catch (error) {
            console.log(error.message)
        }

    };

    const handleOpenFileInput = (i) => {
        inputRefs.current[i].click();
    };

    const handleOpenModal = (entry, index) => {
        setIsOpenModal(!isOpenModal)
        setModalData({ entry, index })
        setContent(entry.importedURL ? entry.importedURL : '')
    }

    const saveAndExitModal = async () => {
        await post(`/${pluginId}/saveImportedURL`,
            {
                id: modalData.entry.id,
                url: content,
            });
        setIsOpenModal(!isOpenModal)
        fetchImport();
    }

    if (isLoading) {
        return <Loader>Loading content...</Loader>;
    }

    return (
        <Box padding={8} background="neutral100">
            <Table colCount={COL_COUNT} rowCount={ROW_COUNT}>
                <Thead>
                    <Tr>
                        <Th>
                            <BaseCheckbox aria-label="Select all entries" />
                        </Th>
                        <Th>
                            <Typography variant="sigma">ID</Typography>
                        </Th>
                        <Th>
                            <Typography variant="sigma">File</Typography>
                        </Th>
                        <Th>
                            <VisuallyHidden>Actions</VisuallyHidden>
                        </Th>
                        <Th>
                            <Typography variant="sigma">Summary</Typography>
                        </Th>
                        <Th>
                            <Typography variant="sigma">Info & Options</Typography>
                        </Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {importedFiles && importedFiles.map((entry, index) => <Tr key={entry.id}>
                        <Td>
                            <BaseCheckbox aria-label={`Select ${entry.name}`} />
                        </Td>
                        <Td>
                            <Typography textColor="neutral800">{entry.id}</Typography>
                        </Td>
                        <Td>
                            <Flex direction="column">
                                <Typography textColor="neutral800" variant="omega" fontWeight="bold">{entry.name}</Typography>
                                <Typography textColor="neutral800">{entry.importedFile ? entry.importedFile.name : "Κάνε εισαγωγή του αρχείου"}</Typography>
                                {loadingValue !== 0 && loadingValue !== 100 &&
                                    <ProgressBar value={loadingValue}>{loadingValue.toString()}</ProgressBar>
                                }
                                <Link to={`/plugins/import-products/mapping/${entry.id}`}>
                                    mapping
                                </Link>
                                {/* <Link onClick={(e) => handleExportClick(entry.name)}>Export xml</Link> */}
                            </Flex>
                        </Td>
                        <Td>
                            {isImported ? <Loader small>L</Loader> :
                                <Flex direction="column">
                                    <Button fullWidth variant='secondary' onClick={() => handleOpenModal(entry, index)} label="Select File">Εισαγωγή Αρχείου</Button>
                                    <Button fullWidth variant='secondary' onClick={() => handleRunImport(entry)} label="Run Import">Run Import</Button>
                                </Flex>}
                        </Td>
                        <Td>
                            <Flex direction="column">
                                <Typography textColor="neutral800">Τελευταία Ενημέρωση:</Typography>
                                {entry.lastRun && <Typography textColor="neutral800">{new Date(entry.lastRun).toLocaleDateString()} {new Date(entry.lastRun).toLocaleTimeString()}</Typography>}
                            </Flex>
                        </Td>
                        <Td>
                            <Typography textColor="neutral800">{entry.report}</Typography>
                        </Td>
                    </Tr>)}
                </Tbody>
            </Table>
            {isOpenModal && <ModalLayout onClose={() => setIsOpenModal(!isOpenModal)} labelledBy="title">
                <ModalHeader>
                    <Typography fontWeight="bold" textColor="neutral800" as="h2" id="title">
                        {modalData.entry.name}
                    </Typography>
                </ModalHeader>
                <ModalBody>
                    <Stack spacing={8}>
                        <Box padding={2}>
                            <Stack horizontal spacing={4}>
                                <Typography textColor="neutral800">{modalData.entry.importedFile ? modalData.entry.importedFile.name : "Κάνε εισαγωγή του αρχείου"}</Typography>
                                {loadingValue !== 0 && loadingValue !== 100 &&
                                    <ProgressBar value={loadingValue}>{loadingValue.toString()}</ProgressBar>
                                }
                                <Button variant='secondary' onClick={() => handleOpenFileInput(modalData.index)} label="Select File">Select File</Button>
                                <VisuallyHidden>
                                    <input
                                        ref={(element) => inputRefs.current[modalData.index] = element}
                                        type="file"
                                        accept=".xml,.csv,.xlsx"
                                        onChange={e => handleOnChangeFileInput(e, modalData.entry)}
                                    />
                                </VisuallyHidden>
                            </Stack>
                        </Box>
                        <Box padding={2}>
                            <Stack>
                                <Textarea
                                    placeholder="http://www.xml.gr"
                                    label="URL path του xml αρχείου"
                                    name="URLpath"
                                    onChange={e => setContent(e.target.value)}>
                                    {content}
                                </Textarea>
                            </Stack>
                        </Box>
                    </Stack>
                </ModalBody>
                <ModalFooter startActions={<Button onClick={() => setIsOpenModal(!isOpenModal)} variant="tertiary">
                    Cancel
                </Button>} endActions={<>
                    <Button onClick={() => saveAndExitModal()}>Save And Exit</Button>
                </>} />
            </ModalLayout>}
        </Box>
    )
}

export default UploadFileForm;