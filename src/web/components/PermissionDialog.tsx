import { useState } from "react";

interface Props {
  onApprove: () => void;
  onReject: () => void;
  command: string;
  description?: string;
}

export function PermissionDialog({ onApprove, onReject, command, description }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        <div className="px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600">⚠️</span>
            <span className="font-semibold text-yellow-800 dark:text-yellow-200">Permission Required</span>
          </div>
        </div>
        <div className="px-4 py-4">
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{description}</p>
          )}
          <div className="bg-gray-100 dark:bg-gray-900 rounded-md p-3 font-mono text-sm break-all">
            {command}
          </div>
        </div>
        <div className="px-4 py-3 flex justify-end gap-2 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={onReject}
            className="px-4 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Reject
          </button>
          <button
            onClick={onApprove}
            className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}

interface ApprovalState {
  id: string;
  command: string;
  description?: string;
  resolve: (approved: boolean) => void;
}

let approvalQueue: ApprovalState[] = [];
let setApprovalState: ((state: ApprovalState | null) => void) | null = null;

export function requestApproval(command: string, description?: string): Promise<boolean> {
  return new Promise((resolve) => {
    const item: ApprovalState = { id: `approval-${Date.now()}`, command, description, resolve };
    approvalQueue.push(item);
    if (setApprovalState) setApprovalState(item);
  });
}

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<ApprovalState | null>(null);

  setApprovalState = setCurrent;

  const handleApprove = () => {
    current?.resolve(true);
    approvalQueue = approvalQueue.filter((a) => a.id !== current?.id);
    setCurrent(approvalQueue[0] || null);
  };

  const handleReject = () => {
    current?.resolve(false);
    approvalQueue = approvalQueue.filter((a) => a.id !== current?.id);
    setCurrent(approvalQueue[0] || null);
  };

  return (
    <>
      {children}
      {current && (
        <PermissionDialog
          command={current.command}
          description={current.description}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </>
  );
}
