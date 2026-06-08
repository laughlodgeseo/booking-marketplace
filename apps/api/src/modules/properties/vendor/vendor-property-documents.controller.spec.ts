import { PassThrough, Readable } from 'stream';
import { UserRole } from '@prisma/client';
import { VendorPropertyDocumentsController } from './vendor-property-documents.controller';
import { PropertyDocumentsService } from '../documents/property-documents.service';

function makeResponse() {
  const res = new PassThrough() as PassThrough & {
    setHeader: jest.Mock;
    status: jest.Mock;
    json: jest.Mock;
  };
  res.setHeader = jest.fn();
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('VendorPropertyDocumentsController', () => {
  function buildController() {
    const docs = {
      openDocumentStream: jest.fn().mockResolvedValue({
        type: 'stream',
        stream: Readable.from(Buffer.from('file')),
        fileName: 'lease.pdf',
        mimeType: 'application/pdf',
      }),
      deleteDocument: jest.fn(),
    } as unknown as PropertyDocumentsService;
    return { controller: new VendorPropertyDocumentsController(docs), docs };
  }

  const user = { id: 'vendor_1', role: UserRole.VENDOR } as never;

  it('sets attachment headers for download', async () => {
    const { controller } = buildController();
    const res = makeResponse();

    await controller.download('prop_1', 'doc_1', user, res as never);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="lease.pdf"',
    );
    expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
  });

  it('sets inline headers for view', async () => {
    const { controller } = buildController();
    const res = makeResponse();

    await controller.view('prop_1', 'doc_1', user, res as never);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'inline; filename="lease.pdf"',
    );
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
  });
});
