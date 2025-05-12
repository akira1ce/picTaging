import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import Modal from "react-native-modal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AntDesign } from "@expo/vector-icons";
import Toast from "react-native-toast-message";

interface Tag {
  id: string;
  name: string;
  groupId?: string;
  isTimeTag?: boolean;
}

interface TagGroup {
  id: string;
  name: string;
  tags: Tag[];
}

interface TagModalProps {
  visible: boolean;
  onClose: () => void;
  image: {
    id: string;
    uri: string;
    tags: Tag[];
  } | null;
  onUpdateTags: (tags: Tag[]) => void;
}

const TagModal: React.FC<TagModalProps> = ({ visible, onClose, image, onUpdateTags }) => {
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [timeTag, setTimeTag] = useState("");
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    loadTagGroups();
    if (image?.tags) {
      setSelectedTags(image.tags);
    } else {
      setSelectedTags([]);
    }
    setTimeTag("");
    setSearchText("");
  }, [image]);

  const loadTagGroups = async () => {
    try {
      const savedGroups = await AsyncStorage.getItem("tagGroups");
      if (savedGroups) {
        setTagGroups(JSON.parse(savedGroups));
      }
    } catch (error) {
      console.error("加载标签组失败:", error);
      Toast.show({
        type: "error",
        text1: "错误",
        text2: "加载标签组失败",
      });
    }
  };

  const addTimeTag = () => {
    if (!timeTag.trim()) return;

    const timeTagObject: Tag = {
      id: `time-${Date.now().toString()}`,
      name: timeTag,
      isTimeTag: true,
    };

    // Check if we already have a time tag
    const existingTimeTagIndex = selectedTags.findIndex((tag) => tag.isTimeTag);

    let newSelectedTags: Tag[];
    if (existingTimeTagIndex >= 0) {
      // Replace existing time tag
      newSelectedTags = [...selectedTags];
      newSelectedTags[existingTimeTagIndex] = timeTagObject;
    } else {
      // Add new time tag
      newSelectedTags = [...selectedTags, timeTagObject];
    }

    setSelectedTags(newSelectedTags);
    setTimeTag("");
    Toast.show({
      type: "success",
      text1: "成功",
      text2: `已设置时间标签「${timeTag}」`,
    });
  };

  const toggleTag = (groupId: string, tag: Tag) => {
    const isSelected = selectedTags.some((t) => t.id === tag.id);
    let newSelectedTags: Tag[];
    if (isSelected) {
      newSelectedTags = selectedTags.filter((t) => t.id !== tag.id);
    } else {
      newSelectedTags = [...selectedTags, { ...tag, groupId }];
    }
    setSelectedTags(newSelectedTags);
  };

  const handleSave = () => {
    const tags = selectedTags.sort((a, b) => {
      if (a.isTimeTag && !b.isTimeTag) return -1;
      if (!a.isTimeTag && b.isTimeTag) return 1;
      return a.name.localeCompare(b.name, "zh-CN");
    });

    onUpdateTags(tags);
    onClose();
    Toast.show({
      type: "success",
      text1: "成功",
      text2: "标签已保存",
    });
  };

  const clearAllTags = () => {
    if (selectedTags.length === 0) {
      Toast.show({
        type: "info",
        text1: "提示",
        text2: "没有已选择的标签",
      });
      return;
    }

    Alert.alert("清空标签", "确定要清空所有已选择的标签吗？", [
      { text: "取消" },
      {
        text: "确定",
        onPress: () => {
          setSelectedTags([]);
          Toast.show({
            type: "success",
            text1: "成功",
            text2: "已清空所有标签",
          });
        },
      },
    ]);
  };

  // Filter tags based on search input
  const getFilteredGroups = () => {
    if (!searchText.trim()) return tagGroups;

    return tagGroups
      .map((group) => ({
        ...group,
        tags: group.tags.filter((tag) => tag.name.toLowerCase().includes(searchText.toLowerCase())),
      }))
      .filter((group) => group.tags.length > 0);
  };

  return (
    <Modal isVisible={visible} onBackdropPress={onClose} style={styles.modal}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>为图片添加标签</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity onPress={clearAllTags} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>清空</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.saveButton}>保存</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <AntDesign name="search1" size={20} color="#aaa" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="搜索标签..."
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText("")} style={styles.clearSearchButton}>
                <AntDesign name="close" size={16} color="#aaa" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Time Tag Section */}
        <View style={styles.timeTagSection}>
          <Text style={styles.sectionTitle}>时间标签</Text>
          <View style={styles.timeTagInputContainer}>
            <TextInput
              style={styles.input}
              placeholder="输入时间标签 (如: 2024年6月)"
              value={timeTag}
              onChangeText={setTimeTag}
            />
            <TouchableOpacity style={styles.addButton} onPress={addTimeTag}>
              <AntDesign name="clockcircleo" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Display selected time tag if exists */}
          {selectedTags.some((tag) => tag.isTimeTag) && (
            <View style={styles.selectedTimeTag}>
              <Text style={styles.selectedTimeTagLabel}>当前时间标签:</Text>
              {selectedTags
                .filter((tag) => tag.isTimeTag)
                .map((tag) => (
                  <View key={tag.id} style={styles.timeTagBadge}>
                    <Text style={styles.timeTagText}>{tag.name}</Text>
                    <TouchableOpacity
                      onPress={() => setSelectedTags(selectedTags.filter((t) => !t.isTimeTag))}
                      style={styles.removeTimeTagButton}>
                      <AntDesign name="close" size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
            </View>
          )}
        </View>

        <Text style={styles.allTagsTitle}>所有标签</Text>
        <ScrollView style={styles.groupsContainer}>
          {getFilteredGroups().length === 0 ? (
            <View style={styles.emptyContainer}>
              {searchText.length > 0 ? (
                <Text style={styles.emptyText}>没有找到匹配的标签</Text>
              ) : (
                <Text style={styles.emptyText}>暂无标签分组，请先在标签管理页面创建标签</Text>
              )}
            </View>
          ) : (
            getFilteredGroups().map((group) => (
              <View key={group.id} style={styles.groupSection}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupName}>{group.name}</Text>
                </View>
                <View style={styles.tagsContainer}>
                  {group.tags.map((tag) => (
                    <TouchableOpacity
                      key={tag.id}
                      style={[
                        styles.tag,
                        selectedTags.some((t) => t.id === tag.id) && styles.tagSelected,
                      ]}
                      onPress={() => toggleTag(group.id, tag)}>
                      <Text
                        style={[
                          styles.tagText,
                          selectedTags.some((t) => t.id === tag.id) && styles.tagSelectedText,
                        ]}>
                        {tag.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "white",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 16,
    height: "85%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  saveButton: {
    color: "#2196F3",
    fontSize: 16,
    fontWeight: "600",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  clearButton: {
    marginRight: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  clearButtonText: {
    color: "#FF5722",
    fontSize: 16,
    fontWeight: "600",
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#333",
  },
  clearSearchButton: {
    padding: 4,
  },
  timeTagSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
    color: "#333",
  },
  timeTagInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    fontSize: 15,
    backgroundColor: "#fafafa",
  },
  addButton: {
    backgroundColor: "#2196F3",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2196F3",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  selectedTimeTag: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  selectedTimeTagLabel: {
    fontSize: 14,
    color: "#666",
    marginRight: 8,
  },
  timeTagBadge: {
    backgroundColor: "#4CAF50",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  timeTagText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
    marginRight: 5,
  },
  removeTimeTagButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedTagsSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
  },
  selectedTagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  selectedTagBadge: {
    backgroundColor: "#E3F2FD",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#90CAF9",
  },
  selectedTagText: {
    color: "#1976D2",
    fontWeight: "500",
    fontSize: 14,
    marginRight: 5,
  },
  removeSelectedTagButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  allTagsTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
    color: "#333",
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
    marginBottom: 40,
  },
  emptyText: {
    fontSize: 15,
    color: "#888",
    textAlign: "center",
    lineHeight: 22,
  },
  groupsContainer: {
    flex: 1,
  },
  groupSection: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    overflow: "hidden",
  },
  groupHeader: {
    padding: 10,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  groupName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 10,
    backgroundColor: "#fff",
  },
  tag: {
    backgroundColor: "#f1f3f5",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  tagSelected: {
    backgroundColor: "#2196F3",
    borderColor: "#1976D2",
  },
  tagText: {
    color: "#495057",
    fontSize: 14,
    fontWeight: "500",
  },
  tagSelectedText: {
    color: "#ffffff",
    fontWeight: "600",
  },
});

export default TagModal;
