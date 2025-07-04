interface UploadEvent {
    type: 'upload';
    fileName: string;
    content: string;
}

interface DownloadEvent {
    type: 'download';
    fileName: string;
}

type FileEvent = UploadEvent | DownloadEvent;

const handleFileEvent = (event: FileEvent) => {
    switch (event.type) {
        case "upload":
            console.log(`Uploading file: ${event.fileName}`);
            console.log(`Content: ${event.content}`);
            break;
        case "download":
            console.log(`Downloading file: ${event.fileName}`);
            break;
    }
};