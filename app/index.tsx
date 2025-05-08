import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, TouchableOpacity, Image, Text, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { AntDesign } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import TagModal from "@/components/TagModal";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

const MAX_IMAGES = 80;

interface Tag {
  id: string;
  name: string;
  groupId?: string;
  isTimeTag?: boolean;
}

interface ImageItem {
  id: string;
  uri: string;
  tags: Tag[];
}

const HomeScreen = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [isTagModalVisible, setTagModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Toast.show({
          type: "error",
          text1: "权限错误",
          text2: "需要相册访问权限！",
        });
      }
      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraStatus.status !== "granted") {
        Toast.show({
          type: "error",
          text1: "权限错误",
          text2: "需要相机访问权限！",
        });
      }
    })();
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const savedImages = await AsyncStorage.getItem("images");
      if (savedImages) {
        setImages(JSON.parse(savedImages));
      }
    } catch (error) {
      console.error("加载图片失败:", error);
      Toast.show({
        type: "error",
        text1: "错误",
        text2: "加载图片失败",
      });
    }
  };

  const takePhoto = async () => {
    if (images.length >= MAX_IMAGES) {
      Toast.show({
        type: "info",
        text1: "已达上限",
        text2: `最多只能添加${MAX_IMAGES}张图片`,
      });
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 1,
    });

    if (!result.canceled) {
      const newImage: ImageItem = {
        id: Date.now().toString(),
        uri: result.assets[0].uri,
        tags: [],
      };
      const updatedImages = [...images, newImage];
      setImages(updatedImages);
      await AsyncStorage.setItem("images", JSON.stringify(updatedImages));
    }
  };

  const openTagModal = (image: ImageItem) => {
    setSelectedImage(image);
    setTagModalVisible(true);
  };

  const updateImageTags = async (imageId: string, tags: Tag[]) => {
    const updatedImages = images.map((img) => (img.id === imageId ? { ...img, tags } : img));
    setImages(updatedImages);
    await AsyncStorage.setItem("images", JSON.stringify(updatedImages));
  };

  const generateUniqueFileName = (tags: Tag[], usedNames: Set<string>) => {
    // 如果没有标签，使用时间戳
    if (!tags || tags.length === 0) {
      return `image_${Date.now()}`;
    }

    // 使用标签名称生成基础文件名
    const baseFileName = tags.map((tag) => tag.name).join("_");
    let fileName = baseFileName;
    let counter = 1;

    // 如果文件名重复，添加数字后缀
    while (usedNames.has(fileName)) {
      fileName = `${baseFileName}_${counter}`;
      counter++;
    }

    usedNames.add(fileName);
    return fileName;
  };

  const exportImages = async () => {
    try {
      if (images.length === 0) {
        Toast.show({
          type: "info",
          text1: "提示",
          text2: "没有可导出的图片",
        });
        return;
      }

      // 请求相册权限
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        Toast.show({
          type: "error",
          text1: "权限错误",
          text2: "需要相册访问权限才能保存文件",
        });
        return;
      }

      // 设置批处理参数
      const BATCH_SIZE = 10; // 每批处理的图片数量
      const totalBatches = Math.ceil(images.length / BATCH_SIZE);
      let processedCount = 0;

      // 显示进度提示
      Toast.show({
        type: "info",
        text1: "导出开始",
        text2: `正在导出 ${images.length} 张图片，请稍候...`,
      });

      // 用于跟踪已使用的文件名
      const usedNames = new Set<string>();

      // 创建或获取相册
      let picTagingAlbum = await MediaLibrary.getAlbumAsync("picTaging");
      if (!picTagingAlbum) {
        try {
          // 先创建一个临时文件用于创建相册
          const tempFile = `${FileSystem.cacheDirectory}album_init.jpg`;
          await FileSystem.copyAsync({
            from: images[0].uri,
            to: tempFile,
          });

          const initialAsset = await MediaLibrary.createAssetAsync(tempFile);
          picTagingAlbum = await MediaLibrary.createAlbumAsync("picTaging", initialAsset);

          // 清理临时文件
          await FileSystem.deleteAsync(tempFile, { idempotent: true });
        } catch (err) {
          console.error("创建相册失败:", err);
          Toast.show({
            type: "error",
            text1: "错误",
            text2: "创建相册失败",
          });
          return;
        }
      }

      // 分批处理图片
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startIndex = batchIndex * BATCH_SIZE;
        const endIndex = Math.min(startIndex + BATCH_SIZE, images.length);
        const batchImages = images.slice(startIndex, endIndex);

        // 处理当前批次的图片
        const batchAssets = [];
        for (const img of batchImages) {
          try {
            // 生成唯一的文件名
            const fileName = generateUniqueFileName(img.tags, usedNames);
            // 创建临时文件
            const tempFile = `${FileSystem.cacheDirectory}${fileName}.jpg`;
            await FileSystem.copyAsync({
              from: img.uri,
              to: tempFile,
            });
            const asset = await MediaLibrary.createAssetAsync(tempFile);
            if (asset) {
              batchAssets.push(asset);
            }
            // 清理临时文件
            await FileSystem.deleteAsync(tempFile, { idempotent: true });

            processedCount++;
          } catch (err) {
            console.warn(`创建资产失败: ${img.uri}`, err);
            continue;
          }
        }

        // 将当前批次资产添加到相册
        if (batchAssets.length > 0) {
          try {
            await MediaLibrary.addAssetsToAlbumAsync(batchAssets, picTagingAlbum, false);
          } catch (err) {
            console.error("添加资产到相册失败:", err);
          }
        }

        // 更新进度提示
        if (batchIndex < totalBatches - 1) {
          console.log(`导出进度: ${processedCount}/${images.length}`);
        }
      }

      Toast.show({
        type: "success",
        text1: "成功",
        text2: `已成功导出 ${processedCount} 张图片到 picTaging 相册`,
      });
    } catch (err) {
      console.error("导出过程失败:", err);
      Toast.show({
        type: "error",
        text1: "错误",
        text2: "导出失败，请重试",
      });
    }
  };

  const clearAllImages = () => {
    if (images.length === 0) {
      Toast.show({
        type: "info",
        text1: "提示",
        text2: "列表已为空",
      });
      return;
    }

    Alert.alert("清空列表", "确定要删除所有图片吗？此操作不可恢复", [
      { text: "取消" },
      {
        text: "确定",
        onPress: async () => {
          setImages([]);
          await AsyncStorage.setItem("images", JSON.stringify([]));
          Toast.show({
            type: "success",
            text1: "成功",
            text2: "已清空所有图片",
          });
        },
      },
    ]);
  };

  const deleteImage = (imageId: string) => {
    Alert.alert("删除图片", "确定要删除这张图片吗？", [
      { text: "取消" },
      {
        text: "确定",
        onPress: async () => {
          const updatedImages = images.filter((img) => img.id !== imageId);
          setImages(updatedImages);
          await AsyncStorage.setItem("images", JSON.stringify(updatedImages));
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: ImageItem }) => (
    <View style={styles.imageContainer}>
      <TouchableOpacity style={styles.imageWrapper} onPress={() => openTagModal(item)}>
        <Image source={{ uri: item.uri }} style={styles.image} />
        <View style={styles.tagContainer}>
          {item.tags.map((tag, index) => (
            <Text key={index} style={styles.tag}>
              {tag.name}
            </Text>
          ))}
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteButton} onPress={() => deleteImage(item.id)}>
        <AntDesign name="delete" size={20} color="#ff4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={images}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
      />

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={takePhoto}>
          <AntDesign name="camera" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={exportImages}>
          <AntDesign name="export" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: "#ff4444" }]}
          onPress={clearAllImages}>
          <AntDesign name="delete" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <TagModal
        visible={isTagModalVisible}
        onClose={() => setTagModalVisible(false)}
        image={selectedImage}
        onUpdateTags={(tags) => updateImageTags(selectedImage?.id || "", tags)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  list: {
    padding: 10,
  },
  imageContainer: {
    flex: 1,
    margin: 5,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
    position: "relative",
  },
  imageWrapper: {
    borderRadius: 10,
    overflow: "hidden",
  },
  deleteButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 15,
    padding: 5,
    zIndex: 1,
  },
  image: {
    width: "100%",
    height: 150,
  },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 5,
  },
  tag: {
    backgroundColor: "#e0e0e0",
    borderRadius: 10,
    padding: 4,
    margin: 2,
    fontSize: 12,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 20,
    right: 20,
    flexDirection: "row",
  },
  button: {
    backgroundColor: "#2196F3",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
    elevation: 5,
  },
});

export default HomeScreen;
