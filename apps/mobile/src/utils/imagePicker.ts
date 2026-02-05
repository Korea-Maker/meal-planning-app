import {
  ImagePickerResponse,
  launchImageLibrary,
  launchCamera,
  MediaType,
  CameraOptions,
  ImageLibraryOptions,
} from 'react-native-image-picker';
import { Alert, Platform } from 'react-native';

export interface ImageResult {
  uri: string;
  type: string;
  fileName: string;
  fileSize: number;
  width: number;
  height: number;
}

const DEFAULT_OPTIONS: CameraOptions & ImageLibraryOptions = {
  mediaType: 'photo' as MediaType,
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 0.8,
  includeBase64: false,
};

/**
 * Pick an image from the device's photo library
 */
export async function pickImageFromGallery(): Promise<ImageResult | null> {
  try {
    const response: ImagePickerResponse = await launchImageLibrary(DEFAULT_OPTIONS);

    return handleImagePickerResponse(response);
  } catch (error) {
    console.error('Error picking image from gallery:', error);
    Alert.alert('Error', 'Failed to pick image from gallery');
    return null;
  }
}

/**
 * Take a photo using the device's camera
 */
export async function takePhoto(): Promise<ImageResult | null> {
  try {
    const response: ImagePickerResponse = await launchCamera(DEFAULT_OPTIONS);

    return handleImagePickerResponse(response);
  } catch (error) {
    console.error('Error taking photo:', error);
    Alert.alert('Error', 'Failed to take photo');
    return null;
  }
}

/**
 * Show options to either pick from gallery or take a photo
 */
export function showImagePickerOptions(): Promise<ImageResult | null> {
  return new Promise((resolve) => {
    Alert.alert(
      'Select Image',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const result = await takePhoto();
            resolve(result);
          },
        },
        {
          text: 'Choose from Library',
          onPress: async () => {
            const result = await pickImageFromGallery();
            resolve(result);
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(null),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(null) }
    );
  });
}

/**
 * Handle the response from image picker
 */
function handleImagePickerResponse(
  response: ImagePickerResponse
): ImageResult | null {
  if (response.didCancel) {
    console.log('User cancelled image picker');
    return null;
  }

  if (response.errorCode) {
    console.error('ImagePicker Error:', response.errorCode, response.errorMessage);

    // Handle specific error cases
    if (response.errorCode === 'permission') {
      Alert.alert(
        'Permission Required',
        'Please grant camera/photo library permission in Settings to use this feature.'
      );
    } else if (response.errorCode === 'camera_unavailable') {
      Alert.alert('Camera Unavailable', 'Camera is not available on this device.');
    } else {
      Alert.alert('Error', response.errorMessage || 'Failed to pick image');
    }

    return null;
  }

  const asset = response.assets?.[0];

  if (!asset || !asset.uri) {
    console.error('No asset found in response');
    return null;
  }

  return {
    uri: asset.uri,
    type: asset.type || 'image/jpeg',
    fileName: asset.fileName || `image_${Date.now()}.jpg`,
    fileSize: asset.fileSize || 0,
    width: asset.width || 0,
    height: asset.height || 0,
  };
}

/**
 * Check if camera is available on the device
 */
export function isCameraAvailable(): boolean {
  // Camera is generally available on physical devices
  // You can add more sophisticated checks if needed
  return Platform.OS === 'ios' || Platform.OS === 'android';
}
