import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface GoogleDriveConfig {
  clientId: string;
  scopes: string[];
}

interface UploadResult {
  success: boolean;
  fileId?: string;
  error?: string;
}

interface DownloadResult {
  success: boolean;
  data?: string;
  error?: string;
}

class GoogleDriveService {
  private static instance: GoogleDriveService;
  private isConfigured = false;
  private readonly DRIVE_FOLDER_NAME = 'Attendance_App_Backups';
  private folderId: string | null = null;

  private constructor() {}

  static getInstance(): GoogleDriveService {
    if (!GoogleDriveService.instance) {
      GoogleDriveService.instance = new GoogleDriveService();
    }
    return GoogleDriveService.instance;
  }

  // Configure Google Sign-In for Drive access
  async configure(): Promise<void> {
    if (this.isConfigured) return;

    GoogleSignin.configure({
      scopes: ['https://www.googleapis.com/auth/drive.file'], // Drive scope for file operations
      webClientId: '744937657357-vgj5p2upoj7n3huvqa7ftmgda2ujtvuk.apps.googleusercontent.com',
      offlineAccess: true,
    });

    this.isConfigured = true;
    console.log('Google Sign-In configured for Drive access');
  }

  // Sign in with Google
  async signIn(): Promise<boolean> {
    try {
      await this.configure();
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();
      console.log('Successfully signed in with Google');
      return true;
    } catch (error) {
      console.error('Google Sign-In error:', error);
      return false;
    }
  }

  // Sign out from Google
  async signOut(): Promise<void> {
    try {
      await GoogleSignin.signOut();
      this.folderId = null;
      console.log('Signed out from Google');
    } catch (error) {
      console.error('Error signing out from Google:', error);
    }
  }

  // Get access token
  private async getAccessToken(): Promise<string | null> {
    try {
      const { accessToken } = await GoogleSignin.getTokens();
      return accessToken;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  // Check if signed in
  async isSignedIn(): Promise<boolean> {
    try {
      const user = await GoogleSignin.getCurrentUser();
      return !!user;
    } catch (error) {
      console.error('Error checking sign-in status:', error);
      return false;
    }
  }

  // Get or create backup folder in Google Drive
  private async getOrCreateBackupFolder(accessToken: string): Promise<string | null> {
    if (this.folderId) return this.folderId;

    try {
      // First, try to find existing folder
      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${this.DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const searchData = await searchResponse.json();

      if (searchData.files && searchData.files.length > 0) {
        this.folderId = searchData.files[0].id;
        return this.folderId;
      }

      // Create new folder if not found
      const createResponse = await fetch(
        'https://www.googleapis.com/drive/v3/files',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: this.DRIVE_FOLDER_NAME,
            mimeType: 'application/vnd.google-apps.folder',
          }),
        }
      );

      const createData = await createResponse.json();
      if (createData.id) {
        this.folderId = createData.id;
        return this.folderId;
      }

      return null;
    } catch (error) {
      console.error('Error getting/creating backup folder:', error);
      return null;
    }
  }

  // Upload file to Google Drive
  async uploadFile(fileName: string, fileContent: string): Promise<UploadResult> {
    try {
      const isSignedIn = await this.isSignedIn();
      if (!isSignedIn) {
        return { success: false, error: 'Not signed in to Google' };
      }

      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        return { success: false, error: 'Failed to get access token' };
      }

      const folderId = await this.getOrCreateBackupFolder(accessToken);
      if (!folderId) {
        return { success: false, error: 'Failed to create backup folder' };
      }

      // Delete existing file with same name first
      await this.deleteExistingFile(accessToken, folderId, fileName);

      // Create metadata
      const metadata = {
        name: fileName,
        parents: [folderId],
        mimeType: 'application/json',
      };

      // Create multipart request
      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delimiter = "\r\n--" + boundary + "--";

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        fileContent +
        close_delimiter;

      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartRequestBody,
        }
      );

      const data = await response.json();

      if (data.id) {
        console.log('File uploaded successfully:', data.id);
        return { success: true, fileId: data.id };
      } else {
        console.error('Upload failed:', data);
        return { success: false, error: data.error?.message || 'Upload failed' };
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Upload failed' };
    }
  }

  // Download file from Google Drive
  async downloadFile(fileName: string): Promise<DownloadResult> {
    try {
      const isSignedIn = await this.isSignedIn();
      if (!isSignedIn) {
        return { success: false, error: 'Not signed in to Google' };
      }

      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        return { success: false, error: 'Failed to get access token' };
      }

      const folderId = await this.getOrCreateBackupFolder(accessToken);
      if (!folderId) {
        return { success: false, error: 'Failed to access backup folder' };
      }

      // Find the file
      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and '${folderId}' in parents and trashed=false`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const searchData = await searchResponse.json();

      if (!searchData.files || searchData.files.length === 0) {
        return { success: false, error: 'Backup file not found' };
      }

      const fileId = searchData.files[0].id;

      // Download the file
      const downloadResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const fileContent = await downloadResponse.text();

      console.log('File downloaded successfully');
      return { success: true, data: fileContent };
    } catch (error) {
      console.error('Error downloading file:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Download failed' };
    }
  }

  // Delete existing file with same name
  private async deleteExistingFile(accessToken: string, folderId: string, fileName: string): Promise<void> {
    try {
      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and '${folderId}' in parents and trashed=false`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const searchData = await searchResponse.json();

      if (searchData.files && searchData.files.length > 0) {
        for (const file of searchData.files) {
          await fetch(
            `https://www.googleapis.com/drive/v3/files/${file.id}`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );
        }
        console.log('Existing file(s) deleted');
      }
    } catch (error) {
      console.error('Error deleting existing file:', error);
      // Don't throw - we can still proceed with upload
    }
  }

  // Get list of backup files
  async listBackupFiles(): Promise<{ files: any[], error?: string }> {
    try {
      const isSignedIn = await this.isSignedIn();
      if (!isSignedIn) {
        return { files: [], error: 'Not signed in to Google' };
      }

      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        return { files: [], error: 'Failed to get access token' };
      }

      const folderId = await this.getOrCreateBackupFolder(accessToken);
      if (!folderId) {
        return { files: [], error: 'Failed to access backup folder' };
      }

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&orderBy=modifiedTime desc`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      return { files: data.files || [] };
    } catch (error) {
      console.error('Error listing backup files:', error);
      return { files: [], error: error instanceof Error ? error.message : 'Failed to list files' };
    }
  }
}

export const googleDriveService = GoogleDriveService.getInstance();
